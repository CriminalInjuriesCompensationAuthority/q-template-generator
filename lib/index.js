const yamljs = require('yamljs');

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

    function toQuestionnaire(yamlPath) {
        const routes = toJS(yamlPath);
        const states = Object.keys(routes.states);
        const sections = states.reduce((acc, state) => {
            acc[state] = `${state}.json`;
            return acc;
        }, {});

        return JSON.stringify(
            {
                title: null,
                'x-uri': null,
                'x-instanceId': null,
                comments: {},
                answers: {},
                history: {},
                sections,
                routes
            },
            null,
            4
        );
    }

    return Object.freeze({
        toJSON,
        toQuestionnaire
    });
}

module.exports = createYAMLRoutes;
