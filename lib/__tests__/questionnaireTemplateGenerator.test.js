const qTemplateGenerator = require('../index.js')();
const fs = require('fs');
require('./fixtures/toMatchFixture.js');

describe('Questionnaire template generator', () => {
    let simpleQuestionnaireTemplate;

    beforeEach(() => {
        simpleQuestionnaireTemplate = {
            title: null,
            'x-uri': null,
            'x-instanceId': null,
            sections: {
                'p-crime-reported': {
                    $schema: '',
                    id: '',
                    title: '',
                    type: '',
                    required: []
                },
                'p-crime-not-reported': {
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
                },
                'p-police-force': {
                    $schema: '',
                    id: '',
                    title: '',
                    type: '',
                    required: []
                },
                end: {
                    $schema: '',
                    id: '',
                    title: '',
                    type: '',
                    required: []
                }
            },
            routes: {
                initial: 'p-crime-reported',
                states: {
                    'p-crime-reported': {
                        on: {
                            ANSWER: [
                                {
                                    cond: ['==', 'q-crime-reported', 'No'],
                                    target: 'p-crime-not-reported'
                                },
                                {
                                    cond: ['==', 'q-crime-reported', 'Yes'],
                                    target: 'p-date-reported'
                                }
                            ]
                        }
                    },
                    'p-crime-not-reported': {
                        on: {
                            ANSWER: [{target: 'end'}]
                        }
                    },
                    'p-date-reported': {
                        on: {
                            ANSWER: [
                                {
                                    cond: ['dateNotInFuture', 'q-date-reported'],
                                    target: 'p-police-force'
                                },
                                {target: 'end'}
                            ]
                        }
                    },
                    'p-police-force': {
                        on: {
                            ANSWER: [{target: 'end'}]
                        }
                    },
                    end: {
                        on: {ANSWER: []}
                    }
                }
            }
        };
    });

    describe('Given a path to a YAML file representing questionnaire routes', () => {
        it('should convert routes to a questionnaire template', () => {
            const questionnaireTemplateJSON = qTemplateGenerator.generate(
                'lib/__tests__/fixtures/routes.yml'
            );
            const questionnaire = JSON.parse(questionnaireTemplateJSON);

            expect(questionnaire).toEqual(simpleQuestionnaireTemplate);
        });

        it('should output the questionnaire template to a specified file', () => {
            // Ensure we don't overwrite existing files!
            const filePath = `./lib/__tests__/fixtures/${Math.random()}.json`;

            // Create questionnaire and write it to file
            qTemplateGenerator.generate('lib/__tests__/fixtures/routes.yml', filePath);

            // Read the written file contents and use this to see if things are as expected
            const writtenFileContents = fs.readFileSync(filePath, 'utf8');
            const questionnaire = JSON.parse(writtenFileContents);

            // clean up file
            fs.unlinkSync(filePath);

            expect(questionnaire).toEqual(simpleQuestionnaireTemplate);
        });

        it('should insert the repeatable attribute where appropriate', () => {
            const routesResult = {
                initial: 'a',
                states: {
                    a: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'a',
                                    cond: ['==', 1, 1]
                                },
                                {
                                    target: 'b'
                                }
                            ]
                        }
                    },
                    b: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'c'
                                },
                                {
                                    target: 'b'
                                },
                                {
                                    target: 'z'
                                }
                            ]
                        }
                    },
                    c: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'd'
                                }
                            ]
                        }
                    },
                    d: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'e'
                                }
                            ]
                        }
                    },
                    e: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'c'
                                },
                                {
                                    target: 'f',
                                    cond: ['==', 1, 1]
                                }
                            ]
                        }
                    },
                    f: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'g'
                                },
                                {
                                    target: 'a'
                                }
                            ]
                        }
                    },
                    g: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'h'
                                },
                                {
                                    target: 'f'
                                }
                            ]
                        }
                    },
                    h: {
                        on: {
                            ANSWER: [
                                {
                                    target: 'i'
                                }
                            ]
                        }
                    },
                    i: {
                        on: {
                            ANSWER: [
                                {
                                    target: 'z'
                                }
                            ]
                        }
                    },
                    z: {
                        repeatable: true,
                        on: {
                            ANSWER: [
                                {
                                    target: 'z',
                                    cond: ['==', 1, 1]
                                }
                            ]
                        }
                    }
                }
            };

            const questionnaireTemplateJSON = qTemplateGenerator.generate(
                'lib/__tests__/fixtures/routes-with-repeatable-sections.yml'
            );
            const {routes} = JSON.parse(questionnaireTemplateJSON);

            expect(routes).toEqual(routesResult);
        });
    });
});
