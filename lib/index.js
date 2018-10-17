const yamljs = require('yamljs');
const fs = require('fs');
const path = require('path');
const getConnectedComponents = require('./tarjanConnectedComponents').tarjanConnectedComponents;

function createQuestionnaireTemplateGenerator() {
    function toAdjacencyList(routes) {
        const routesAdjacencyList = Object.keys(routes).reduce((acc, key) => {
            if (!['start-page', 'template-name'].includes(key)) {
                acc[key] = routes[key].map(target => target.goto);
            }

            return acc;
        }, {});

        return routesAdjacencyList;
    }

    // Based on the routing rules, this calculates which sections can potentially be repeated.
    // It uses Tarjan's algorithm to get all sections that are "strongly connected" (repeated sections)
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

    function convertYAMLRoutesToJSON(yamlPath, yamlRoutesPath) {
        const routesFromYAML = yamljs.load(yamlPath); // converts to JSON.
        const jsonRoutes = routesFromYAML;
        routesFromYAML.pages.forEach(pageId => {
            const yamlRoutePath = path.join(yamlRoutesPath, `${pageId}.yml`);
            let yamlRouteDefinition = []; // default;
            if (fs.existsSync(yamlRoutePath)) {
                yamlRouteDefinition = yamljs.load(yamlRoutePath);
            }
            jsonRoutes[pageId] = yamlRouteDefinition[pageId] || yamlRouteDefinition;
        });
        delete jsonRoutes.pages;
        return jsonRoutes;
    }

    function translateRouteSyntax(jsonRoutes) {
        const rawRoutes = jsonRoutes;
        const repeatableSections = getRepeatableSections(rawRoutes);

        // set up result object
        const routes = {
            initial: null,
            states: {}
        };

        Object.keys(rawRoutes).forEach(section => {
            if (section === 'start-page' || section === 'template-name') {
                routes.initial = rawRoutes[section];
            } else {
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
            }
        });

        return routes;
    }

    /**
     * @param {Object} options - file, and directory paths of YAML files.
     * @param {String} options.sourceFilePath - path to yaml file that containing routes
     * @param {String} [options.outputFilePath] - path to JSON file. Output will be written to this file.
     * @param {String} [options.sectionsDirPath] - path to folder that contains the section schema definitions.
     * @param {String} [options.routesDirPath] - path to folder that contains the business-defined YAML routes definitions.
     * @returns {String} - Questionnaire stub in JSON format
     */
    function generate(options) {
        const {sourceFilePath, outputFilePath, sectionsDirPath, routesDirPath} = options;
        const expandedJSONRoutes = convertYAMLRoutesToJSON(sourceFilePath, routesDirPath);
        const routes = translateRouteSyntax(expandedJSONRoutes);
        const states = Object.keys(routes.states);
        const sections = states.reduce((acc, state) => {
            acc[state] = getSectionSchemaDefinition(sectionsDirPath, state);
            return acc;
        }, {});
        const questionnaireTemplate = {
            uri: expandedJSONRoutes['template-name'] || '',
            // 'x-instanceId': null, // this is not needed in a template. it is needed in the template instance as it is a unique ID for a user's questionnaire.
            sections,
            routes
        };
        const jsonQuestionnaireTemplate = JSON.stringify(questionnaireTemplate, null, 4);

        if (outputFilePath) {
            fs.writeFileSync(outputFilePath, jsonQuestionnaireTemplate);
        }

        return jsonQuestionnaireTemplate;
    }

    function absolutiseConditionPaths(questionnaireFilePath) {
        const questionnaireRaw = fs.readFileSync(questionnaireFilePath, 'utf-8');
        const questionnaire = JSON.parse(questionnaireRaw, null, 4);

        Object.keys(questionnaire.routes.states).forEach(route => {
            const conditions = questionnaire.routes.states[route].on.ANSWER;
            conditions.forEach((condition, index) => {
                let newOperand = '';
                const cond = condition.cond || [];
                const operator = cond[0];
                // the first item in this array is the operator
                // and we dont need to alter it.
                // cond.shift();

                questionnaire.routes.states[route].on.ANSWER[index].cond = cond.reduce(
                    (acc, operand) => {
                        if (Array.isArray(operand)) {
                            // return absolutiseConditionPaths(operand); // recursive conditions support.
                            // the 'answeredLessThan' operator requires the 'q-' operand to not be absolutised.
                        } else if (
                            operand.startsWith('q-') &&
                            !['answeredLessThan'].includes(operator)
                        ) {
                            // this tells us it is a question ID.
                            Object.keys(questionnaire.sections).forEach(sectionId => {
                                if (
                                    Object.keys(
                                        questionnaire.sections[sectionId].properties
                                    ).includes(operand)
                                ) {
                                    newOperand = `$.${sectionId}.${operand}.value`;
                                }
                            });
                        } else if (operand === 'yes') {
                            // change the 'nice' yes/no strings to schema-friendly booleans.
                            newOperand = 'true';
                        } else if (operand === 'no') {
                            newOperand = 'false';
                        } else {
                            newOperand = operand; // assign the curent value to the new object so it is retained.
                        }
                        acc.push(newOperand);
                        return acc;
                    },
                    []
                );
            });
        });

        const formattedQuestionnaireJSON = JSON.stringify(questionnaire, null, 4);

        // overwrite the old with the new.
        fs.writeFileSync(questionnaireFilePath, formattedQuestionnaireJSON);

        return formattedQuestionnaireJSON;
    }

    return Object.freeze({
        generate,
        absolutiseConditionPaths
    });
}

module.exports = createQuestionnaireTemplateGenerator;
