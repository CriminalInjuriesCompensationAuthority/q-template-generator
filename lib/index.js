const yamljs = require('yamljs');
const fs = require('fs');
const path = require('path');
const getConnectedComponents = require('./tarjanConnectedComponents').tarjanConnectedComponents;

function createQuestionnaireTemplateGenerator() {
    function toAdjacencyList(routes) {
        const routesAdjacencyList = Object.keys(routes).reduce((acc, key) => {
            const routeList = [];
            routes[key].forEach(row => {
                if (Object.keys(row)[0] === 'goto') {
                    routeList.push(row.goto);
                }
            });
            acc[key] = routeList;

            return acc;
        }, {});
        return routesAdjacencyList;
    }

    /**
     * Ensures that each "goto" section id has a valid target
     *
     * @param {Object} routesAdjacencyList
     * @param {String} [filePath] - Path to offending file. Will be show in error message
     */
    function ensureAllTargetsExist(routes, filePath = 'unknown', summary = 'noSummary') {
        const routesAdjacencyList = toAdjacencyList(routes);
        const sectionIdLookup = {};
        let noSummary = true;

        Object.keys(routesAdjacencyList).forEach(srcSectionId => {
            sectionIdLookup[srcSectionId] = true;
        });

        Object.keys(routesAdjacencyList).forEach(srcSectionId => {
            if (srcSectionId === summary) {
                noSummary = false;
            }
            routesAdjacencyList[srcSectionId].forEach(destSectionId => {
                if (!(destSectionId in sectionIdLookup)) {
                    throw Error(
                        `Questionnaire goto statement targets a section id ("${destSectionId}") that does not exist ("- goto: ${destSectionId}"). In file: ${filePath}`
                    );
                }
            });
        });
        if (noSummary && summary !== 'noSummary') {
            throw Error(
                `Questionnaire summary key targets a section id ("${summary}") that does not exist ("summary: ${summary}").`
            );
        }
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

    function getSectionSchemaDefinition(sectionsDirPath, sectionId) {
        const sectionSchemaPath = path.join(sectionsDirPath, `${sectionId}.js`);

        if (!fs.existsSync(sectionSchemaPath)) {
            throw Error(`Section JSON Schema definition does not exist: "${sectionSchemaPath}"`);
        }

        // eslint-disable-next-line global-require,import/no-dynamic-require
        const sectionSchemaDefinition = require(`${path.resolve(sectionSchemaPath)}`);

        return sectionSchemaDefinition;
    }

    // TODO: Possibly use JSON Schema for some of this
    function validateRouteDefinitionSyntax(obj, routePath) {
        // Expected Format:
        // { 'p-applicant-are-you-a-victim': [
        //         { goto: 'p--number-of-attackers', if: [Array] },
        //         { goto: 'p--you-need-a-different-service', if: [Array] }
        //     ]
        // }
        const states = Object.keys(obj);

        // should have single top level key
        if (states.length > 1) {
            throw Error('bla');
        }

        // Target can contain only "goto" and optional "if" or "type"
        states.forEach(state => {
            const targets = obj[state];
            const invalidKeys = [];
            const invalidType = [];
            let conditionCount = 0;
            let typeCount = 0;

            targets.forEach(target => {
                const targetKeys = Object.keys(target);

                targetKeys.forEach(key => {
                    if (key !== 'goto' && key !== 'if' && key !== 'type') {
                        invalidKeys.push(`"${key}"`);
                    }

                    if (key === 'if') {
                        conditionCount += 1;
                    }

                    if (key === 'type') {
                        if (target[key] !== 'final') {
                            invalidType.push(`"${target[key]}"`);
                        } else {
                            typeCount += 1;
                        }
                    }
                });
            });

            if (invalidKeys.length > 0) {
                throw Error(
                    `Route definition ("${routePath}") contains invalid key(s): ${invalidKeys.join(
                        ', '
                    )}. Allowed keys: "goto", "if", "type"`
                );
            }

            if (invalidType.length > 0) {
                throw Error(
                    `Route definition ("${routePath}") contains an invalid value for the type key: ${invalidType.join(
                        ', '
                    )}. Allowed values: "final"`
                );
            }

            // Must have a condition if multiple targets are specified
            if (targets.length > 1 && targets.length - conditionCount - typeCount > 1) {
                throw Error(
                    `Route definition ("${routePath}") has more than one "goto" statement without a condition ("if")`
                );
            }
        });
    }

    function getRouteDefinition(routesDirPath, sectionId) {
        const routePath = path.join(routesDirPath, `${sectionId}.yml`);

        if (!fs.existsSync(routePath)) {
            throw Error(`Route definition does not exist: "${routePath}"`);
        }

        const routeDefinition = yamljs.load(routePath);

        validateRouteDefinitionSyntax(routeDefinition, routePath);

        if (sectionId in routeDefinition) {
            return routeDefinition[sectionId];
        }

        throw Error(
            `Route definition ("${routePath}") does not contain section id: "${sectionId}"`
        );
    }

    function normaliseQuestionnaireMetadata(questionnaireMetadataFilePath, routesDirPath) {
        const questionnaireMetadata = yamljs.load(questionnaireMetadataFilePath);
        const normalisedQuestionnaireMetadata = {
            'template-name': questionnaireMetadata['template-name'],
            'start-page': questionnaireMetadata['start-page'],
            version: questionnaireMetadata.version,
            referrer: questionnaireMetadata.referrer,
            confirmation: questionnaireMetadata.confirmation,
            summary: questionnaireMetadata.summary
        };

        if (Array.isArray(questionnaireMetadata.pages)) {
            // Questionnaire metadata with non resolved route definition references

            normalisedQuestionnaireMetadata.routes = questionnaireMetadata.pages.reduce(
                (acc, sectionId) => {
                    acc[sectionId] = getRouteDefinition(routesDirPath, sectionId);

                    return acc;
                },
                {}
            );
        } else {
            // Questionnaire metadata with resolved route definition references

            normalisedQuestionnaireMetadata.routes = Object.keys(questionnaireMetadata).reduce(
                (acc, key) => {
                    if (key !== 'template-name' && key !== 'start-page' && key !== 'version') {
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
            referrer: questionnaireMetadata.referrer,
            summary: questionnaireMetadata.summary,
            confirmation: questionnaireMetadata.confirmation,
            states: {}
        };

        Object.keys(rawRoutes).forEach(section => {
            const conditions = rawRoutes[section];
            let route = {};

            if (repeatableSections.indexOf(section) > -1) {
                // TODO: Logic for auto repeatable insertion needs looked at. Un-comment when ready.
                // route.repeatable = true;
            }

            conditions.forEach(condition => {
                if (condition.type) {
                    route.type = condition.type;
                }
                if ('goto' in condition || 'if' in condition) {
                    if (!route.on) {
                        route = {
                            on: {
                                ANSWER: []
                            }
                        };
                    }
                    route.on.ANSWER.push({
                        target: condition.goto,
                        cond: condition.if
                    });
                }
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
                    condition[i] = `$.answers.${sectionId}.${questionId}`;
                } else {
                    throw new Error(`Question id ("${questionId}") not found in any section`);
                }
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
     * @param {String} [options.resolvedQuestionnaireMetadataFilePath] - path to YAML file that contains questionnaire metadata with resolved route paths.
     * @param {String} [options.outputFilePath] - path to JSON file. Questionnaire template output will be written to this file.
     * @param {String} [options.sectionsDirPath] - path to folder that contains the JSON Schema section definitions.
     * @param {String} [options.routesDirPath] - path to folder that contains the business-defined YAML route definitions for each section.
     * @returns {String} - Questionnaire template in JSON format
     */
    function generate(options) {
        const questionnaireMetadataFilePath =
            options.questionnaireMetadataFilePath || options.resolvedQuestionnaireMetadataFilePath;
        const questionnaireMetadata = normaliseQuestionnaireMetadata(
            questionnaireMetadataFilePath,
            options.routesDirPath
        );
        ensureAllTargetsExist(
            questionnaireMetadata.routes,
            questionnaireMetadataFilePath,
            questionnaireMetadata.summary
        );
        const sections = Object.keys(questionnaireMetadata.routes).reduce((acc, state) => {
            acc[state] = getSectionSchemaDefinition(options.sectionsDirPath, state);
            return acc;
        }, {});

        processRouteConditions(questionnaireMetadata.routes, sections);
        const routes = translateRouteSyntax(questionnaireMetadata);
        const questionnaireTemplate = {
            type: questionnaireMetadata['template-name'],
            version: questionnaireMetadata.version,
            sections,
            routes,
            answers: {},
            progress: [routes.initial]
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
