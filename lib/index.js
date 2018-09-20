const yamljs = require('yamljs');
const fs = require('fs');

function createYAMLRoutes() {
    function toJS(yamlPath) {
        const yamlRoutes = yamljs.load(yamlPath);

        // set up result object
        const routes = {
            initial: null,
            states: {}
        };

        Object.keys(yamlRoutes).forEach(key => {
            if (key === 'start-page') {
                routes.initial = yamlRoutes[key];
            } else {
                const route = {on: {ANSWER: []}};
                const conditions = yamlRoutes[key];

                conditions.forEach(condition => {
                    route.on.ANSWER.push({
                        target: condition.goto,
                        cond: condition.If
                    });
                });

                routes.states[key] = route;
            }
        });

        return routes;
    }

    function toJSON(yamlPath) {
        return JSON.stringify(toJS(yamlPath), null, 4);
    }

    function toQuestionnaire(yamlPath, outputPath) {
        const routes = toJS(yamlPath);
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
        const questionnaireStub = {
            title: null,
            'x-uri': null,
            'x-instanceId': null,
            answers: {},
            history: {},
            sections,
            routes
        };
        const jsonQuestionnaireStub = JSON.stringify(questionnaireStub, null, 4);

        if (outputPath) {
            fs.writeFileSync(outputPath, jsonQuestionnaireStub);
        }

        return jsonQuestionnaireStub;
    }

    return Object.freeze({
        toJSON,
        toQuestionnaire
    });
}

module.exports = createYAMLRoutes;
