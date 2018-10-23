const yamljs = require('yamljs');
const fs = require('fs');
const path = require('path');
const getConnectedComponents = require('./tarjanConnectedComponents').tarjanConnectedComponents;

function createQuestionnaireTemplateGenerator() {
    function toAdjacencyList(routes) {
        const routesAdjacencyList = Object.keys(routes).reduce((acc, key) => {
            acc[key] = routes[key].map(target => target.goto);

            return acc;
        }, {});

        return routesAdjacencyList;
    }

    // Based on the routing rules, this calculates which sections can potentially be repeated.
    // It uses Tarjan's algorithm to get all sections that are "strongly connected" (*kind of* repeated sections)
    // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
    function getRepeatableSections(routes) {
        const routesAdjacencyList = toAdjacencyList(routes);
        const connectedComponents = getConnectedComponents(routesAdjacencyList);

        // connectedComponents doesn't handle self referencing sections
        // perform another pass to set these
        const repeatableSections = connectedComponents.reduce((acc, value) => {
            if (value.length === 1) {
                const section = value[0];
                const targets = routesAdjacencyList[section];
                const hasSelfReference = targets.find(target => target === section) !== undefined;

                if (hasSelfReference) {
                    acc.push(...value);
                }
            } else {
                acc.push(...value);
            }

            return acc;
        }, []);

        return repeatableSections;
    }

    function getSectionSchemaDefinition(sectionsPath, sectionName) {
        if (sectionsPath) {
            const sectionSchemaDefinitionPath = path.join(sectionsPath, `${sectionName}.json`);
            const sectionSchemaDefinition = fs.readFileSync(sectionSchemaDefinitionPath, 'utf-8');
            return JSON.parse(sectionSchemaDefinition, null, 4);
        }
        return '';
    }

    function normaliseQuestionnaireMetadata(questionnaireMetadataFilePath, routesDirPath) {
        const questionnaireMetadata = yamljs.load(questionnaireMetadataFilePath);
        const normalisedQuestionnaireMetadata = {
            'template-name': questionnaireMetadata['template-name'],
            'start-page': questionnaireMetadata['start-page']
        };

        if (Array.isArray(questionnaireMetadata.pages)) {
            // Non-resolved questionnaire metadata

            normalisedQuestionnaireMetadata.routes = questionnaireMetadata.pages.reduce(
                (acc, pageId) => {
                    const yamlRoutePath = path.join(routesDirPath, `${pageId}.yml`);
                    let yamlRouteDefinition = []; // default;
                    if (fs.existsSync(yamlRoutePath)) {
                        yamlRouteDefinition = yamljs.load(yamlRoutePath);
                    }

                    acc[pageId] = yamlRouteDefinition[pageId] || yamlRouteDefinition;

                    return acc;
                },
                {}
            );
        } else {
            // Resolved questionnaire metadata

            normalisedQuestionnaireMetadata.routes = Object.keys(questionnaireMetadata).reduce(
                (acc, key) => {
                    if (key !== 'template-name' && key !== 'start-page') {
                        acc[key] = questionnaireMetadata[key];
                    }

                    return acc;
                },
                {}
            );
        }

        return normalisedQuestionnaireMetadata;
    }

    function translateRouteSyntax(questionnaireMetadata) {
        const rawRoutes = questionnaireMetadata.routes;
        const repeatableSections = getRepeatableSections(rawRoutes);

        // set up result object
        const routes = {
            initial: questionnaireMetadata['start-page'],
            states: {}
        };

        Object.keys(rawRoutes).forEach(section => {
            const route = {on: {ANSWER: []}};
            const conditions = rawRoutes[section];

            if (repeatableSections.indexOf(section) > -1) {
                route.repeatable = true;
            }

            conditions.forEach(condition => {
                route.on.ANSWER.push({
                    target: condition.goto,
                    cond: condition.if
                });
            });

            routes.states[section] = route;
        });

        return routes;
    }

    function processRouteCondition(condition, sections) {
        /* eslint-disable no-param-reassign */
        for (let i = 1, len = condition.length, value; i < len; i += 1) {
            value = condition[i];

            // Resolve question id to path
            if (typeof value === 'string' && value.startsWith('q-')) {
                const questionId = value;

                // Find the section the question ID belongs to
                /* eslint-disable no-shadow */
                const sectionId = Object.keys(sections).find(
                    sectionId => questionId in sections[sectionId].properties
                );
                /* eslint-enable no-shadow */

                if (sectionId) {
                    condition[i] = `$.${sectionId}.${questionId}.value`;
                } // else {
                //    throw new Error(`Question id "${condition[i]}" not found.`);
                // }
            } else if (value === 'yes') {
                condition[i] = 'true';
            } else if (value === 'no') {
                condition[i] = 'false';
            } else if (Array.isArray(value)) {
                // TODO: handle non-condition arrays
                condition[i] = processRouteCondition(value, sections);
            }
        }

        return condition;
        /* eslint-enable no-param-reassign */
    }

    function processRouteConditions(routes, sections) {
        /* eslint-disable no-param-reassign */
        Object.keys(routes).forEach(sectionId => {
            routes[sectionId] = routes[sectionId].map(route => {
                if ('if' in route) {
                    processRouteCondition(route.if, sections);
                }

                return route;
            });
        });
        /* eslint-enable no-param-reassign */
    }

    /**
     * @param {Object} options - file, and directory paths of YAML files.
     * @param {String} [options.questionnaireMetadataFilePath] - path to YAML file that contains questionnaire metadata.
     * @param {String} [options.resolvedQuestionnaireMetadataFilePath] - path to YAML file that contains questionnaire metadata with pre-resolved route paths.
     * @param {String} [options.outputFilePath] - path to JSON file. Questionnaire template output will be written to this file.
     * @param {String} [options.sectionsDirPath] - path to folder that contains the JSON Schema section definitions.
     * @param {String} [options.routesDirPath] - path to folder that contains the business-defined YAML route definitions for each section.
     * @returns {String} - Questionnaire template in JSON format
     */
    function generate(options) {
        const questionnaireMetadata = normaliseQuestionnaireMetadata(
            options.questionnaireMetadataFilePath || options.resolvedQuestionnaireMetadataFilePath,
            options.routesDirPath
        );
        const sections = Object.keys(questionnaireMetadata.routes).reduce((acc, state) => {
            acc[state] = getSectionSchemaDefinition(options.sectionsDirPath, state);
            return acc;
        }, {});

        processRouteConditions(questionnaireMetadata.routes, sections);

        const routes = translateRouteSyntax(questionnaireMetadata);
        const questionnaireTemplate = {
            uri: questionnaireMetadata['template-name'] || '',
            sections,
            routes
        };
        const jsonQuestionnaireTemplate = JSON.stringify(questionnaireTemplate, null, 4);

        if (options.outputFilePath) {
            fs.writeFileSync(options.outputFilePath, jsonQuestionnaireTemplate);
        }

        return jsonQuestionnaireTemplate;
    }

    return Object.freeze({
        generate
    });
}

module.exports = createQuestionnaireTemplateGenerator;
