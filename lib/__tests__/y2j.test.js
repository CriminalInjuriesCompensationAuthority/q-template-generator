const yamlRoutes = require('../index.js')();
const fs = require('fs');
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

        describe('Questionnaire stub', () => {
            const result = JSON.stringify(
                {
                    title: null,
                    'x-uri': null,
                    'x-instanceId': null,
                    answers: {},
                    history: {},
                    sections: {
                        'p-crime-reported': {
                            $schema: '',
                            id: '',
                            title: '',
                            type: '',
                            required: []
                        },
                        'p-date-reported': {
                            $schema: '',
                            id: '',
                            title: '',
                            type: '',
                            required: []
                        }
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

            it('should convert routes to a questionnaire stub', () => {
                const questionnaireStubJson = yamlRoutes.toQuestionnaire(
                    'lib/__tests__/fixtures/routes.yml'
                );
                expect(questionnaireStubJson).toMatchFixture(result);
            });

            it('should output the questionnaire stub to a specified file', () => {
                // Ensure we don't overwrite existing files!
                const filePath = `./lib/__tests__/fixtures/${Math.random()}.json`;

                yamlRoutes.toQuestionnaire('lib/__tests__/fixtures/routes.yml', filePath);

                const writtenFileContents = fs.readFileSync(filePath, 'utf8');

                // clean up file
                fs.unlinkSync(filePath);

                expect(writtenFileContents).toMatchFixture(result);
            });
        });
    });
});
