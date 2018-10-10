const yamljs = require('yamljs');
const fs = require('fs');
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
     * @param {String} [destinationFilePath] - path to yaml file. Output will be written to this file.
     * @returns {String} - Questionnaire stub in JSON format
     */
    function generate(sourceFilePath, destinationFilePath) {
        const routes = toJS(sourceFilePath);
        const states = Object.keys(routes.states);
        const sections = states.reduce((acc, state) => {
            acc[state] = {
                $schema: '',
                id: '',
                title: '',
                type: '',
                required: []
            };
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
