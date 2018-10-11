const yamljs = require('yamljs');
const fs = require('fs');
const path = require('path');
const getConnectedComponents = require('./tarjanConnectedComponents').tarjanConnectedComponents;

function createQuestionnaireTemplateGenerator() {
    function toAdjacencyList(routes) {
        const routesAdjacencyList = Object.keys(routes).reduce((acc, key) => {
            if (key !== 'start-page') {
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

        if(sectionsPath) {
            const sectionSchemaDefinitionPath = path.join(sectionsPath, `${sectionName}.json`);
            const sectionSchemaDefinition = fs.readFileSync(sectionSchemaDefinitionPath, 'utf-8');
            console.log({sectionSchemaDefinition});
            return JSON.parse(sectionSchemaDefinition, null, 4);
        }
        return '';
    }

    function toJS(yamlPath) {
        const routesFromYAML = yamljs.load(yamlPath);
        const repeatableSections = getRepeatableSections(routesFromYAML);

        // set up result object
        const routes = {
            initial: null,
            states: {}
        };

        Object.keys(routesFromYAML).forEach(section => {
            if (section === 'start-page') {
                routes.initial = routesFromYAML[section];
            } else {
                const route = {on: {ANSWER: []}};
                const conditions = routesFromYAML[section];

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
     * @param {String} sourceFilePath - path to yaml file that containing routes
     * @param {String} [destinationFilePath] - path to JSON file. Output will be written to this file.
     * @param {String} [pageDefinitionsPath] - path to folder that contains the section schema definitions.
     * @returns {String} - Questionnaire stub in JSON format
     */
    function generate(sourceFilePath, destinationFilePath, pageDefinitionsPath) {
        const routes = toJS(sourceFilePath);
        const states = Object.keys(routes.states);
        const sections = states.reduce((acc, state) => {
            let sectionSchemaDefinition = '';
            acc[state] = getSectionSchemaDefinition(pageDefinitionsPath, state)
            return acc;
        }, {});
        const questionnaireTemplate = {
            title: null,
            'x-uri': null,
            'x-instanceId': null,
            sections,
            routes
        };
        const jsonQuestionnaireTemplate = JSON.stringify(questionnaireTemplate, null, 4);

        if (destinationFilePath) {
            fs.writeFileSync(destinationFilePath, jsonQuestionnaireTemplate);
        }

        return jsonQuestionnaireTemplate;
    }

    return Object.freeze({
        generate
    });
}

module.exports = createQuestionnaireTemplateGenerator;
