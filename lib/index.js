const yamljs = require('yamljs');

function createYAMLRoutes() {

    function getRoutes(yamlPath) {
        return yamljs.load(yamlPath);
    }

    function toJSON(yamlPath) {
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

        return JSON.stringify(routes, null, 4);
    }

    return Object.freeze({
        toJSON
    });
}

module.exports = createYAMLRoutes;
