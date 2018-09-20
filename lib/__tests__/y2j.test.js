const yamlRoutes = require('../index.js')();
require('./fixtures/toMatchFixture.js');

describe('YAML rules to JSON', () => {
    describe('Given a path to a YAML file representing questionnaire routes', () => {
        it('should convert routes to JSON', () => {
            const result = `{
                "initial": "p-crime-not-reported",
                "states": {
                    "p-crime-reported": {
                        "on": {
                            "ANSWER": [
                                {
                                    "target": "p-crime-not-reported",
                                    "cond": [
                                        "==",
                                        "q-crime-reported",
                                        "No"
                                    ]
                                },
                                {
                                    "target": "p-date-reported",
                                    "cond": [
                                        "==",
                                        "q-crime-reported",
                                        "Yes"
                                    ]
                                }
                            ]
                        }
                    },
                    "p-date-reported": {
                        "on": {
                            "ANSWER": [
                                {
                                    "target": "p-police-force",
                                    "cond": [
                                        "dateNotInFuture",
                                        "q-date-reported"
                                    ]
                                }
                            ]
                        }
                    }
                }
            }`;

            expect(yamlRoutes.toJSON('lib/__tests__/fixtures/routes.yml')).toMatchFixture(result);
        });

        it('should convert routes to a questionnaire stub', () => {
            const result = JSON.stringify(
                {
                    title: null,
                    'x-uri': null,
                    'x-instanceId': null,
                    comments: {},
                    answers: {},
                    history: {},
                    sections: {
                        'p-crime-reported': 'p-crime-reported.js',
                        'p-date-reported': 'p-date-reported.js'
                    },
                    routes: {
                        initial: 'p-crime-not-reported',
                        states: {
                            'p-crime-reported': {
                                on: {
                                    ANSWER: [
                                        {
                                            target: 'p-crime-not-reported',
                                            cond: ['==', 'q-crime-reported', 'No']
                                        },
                                        {
                                            target: 'p-date-reported',
                                            cond: ['==', 'q-crime-reported', 'Yes']
                                        }
                                    ]
                                }
                            },
                            'p-date-reported': {
                                on: {
                                    ANSWER: [
                                        {
                                            target: 'p-police-force',
                                            cond: ['dateNotInFuture', 'q-date-reported']
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                null,
                4
            );

            expect(yamlRoutes.toQuestionnaire('lib/__tests__/fixtures/routes.yml')).toMatchFixture(
                result
            );
        });
    });
});
