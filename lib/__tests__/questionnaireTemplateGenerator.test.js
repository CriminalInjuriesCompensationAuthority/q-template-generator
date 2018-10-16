const qTemplateGenerator = require('../index.js')();
const fs = require('fs');
require('./fixtures/toMatchFixture.js');

describe('Questionnaire template generator', () => {
    let simpleQuestionnaireTemplate;

    beforeEach(() => {
        simpleQuestionnaireTemplate = {
            uri: 'apply-for-compensation',
            sections: {
                'p-applicant-are-you-a-british-citizen': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id:
                        'http://localhost:3000/schema/definitions/applicant-are-you-a-british-citizen',
                    type: 'object',
                    required: ['q-applicant-are-you-a-british-citizen'],
                    additionalProperties: false,
                    properties: {
                        'q-applicant-are-you-a-british-citizen': {
                            type: 'boolean',
                            title: 'Are you a British citizen?',
                            errorMessages: {
                                required: 'You need to tell us if you are a British citizen'
                            }
                        }
                    }
                },
                'p-applicant-over-18': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/applicant-over-18',
                    type: 'object',
                    required: ['q-are-you-18-or-over'],
                    additionalProperties: false,
                    properties: {
                        'q-are-you-18-or-over': {
                            type: 'boolean',
                            title: 'Are you 18 or over?',
                            errorMessages: {
                                required: 'Tell us if you are old enough'
                            }
                        }
                    }
                },
                'p--who-is-applying': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/who-are-you-applying-for',
                    type: 'object',
                    required: ['q-who-are-you-applying-for'],
                    additionalProperties: false,
                    properties: {
                        'q-who-are-you-applying-for': {
                            title: 'Who are you applying for?',
                            type: 'string',
                            uniqueItems: true,
                            items: {
                                oneOf: [
                                    {
                                        title: 'Myself',
                                        enum: ['myself']
                                    },
                                    {
                                        title: 'Someone else',
                                        enum: ['someone-else']
                                    }
                                ]
                            },
                            errorMessages: {
                                required: 'Tell us who you are applying for'
                            }
                        }
                    }
                },
                'p-applicant-are-you-a-victim': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/p-applicant-are-you-a-victim',
                    type: 'object',
                    required: ['q-applicant-are-you-a-victim'],
                    additionalProperties: false,
                    properties: {
                        'q-applicant-are-you-a-victim': {
                            type: 'boolean',
                            title: 'Are you a victim of sexual violence or abuse?',
                            errorMessages: {
                                required: 'Select the appropriate option'
                            }
                        }
                    }
                },
                'p--number-of-attackers': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/p--number-of-attackers',
                    title: 'Number of attackers',
                    type: 'object',
                    required: ['q-number-of-attackers'],
                    properties: {
                        'q-number-of-attackers': {
                            title: 'How many attackers were involved in the incident?',
                            type: 'integer',
                            errorMessages: {
                                required: 'Enter the number of people who attacked you',
                                type: 'Enter a number'
                            }
                        }
                    }
                },
                'p--attacker-name': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/p--attacker-name',
                    title: 'Enter their name',
                    type: 'object',
                    required: ['q-attacker-first-name', 'q-attacker-last-name'],
                    additionalProperties: false,
                    properties: {
                        'q-attacker-first-name': {
                            title: 'First name',
                            type: 'string',
                            errorMessages: {
                                required: "Enter the attacker's first name"
                            }
                        },
                        'q-attacker-last-name': {
                            title: 'Last name',
                            type: 'string',
                            errorMessages: {
                                required: "Enter the attacker's last name"
                            }
                        }
                    }
                },
                'p--end-of-demo': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/p--end-of-demo',
                    type: 'object',
                    title: 'End of demo',
                    additionalProperties: false,
                    properties: {
                        'q-crimedetails': {
                            type: 'string',
                            classification: 'markup',
                            enum: ['<p>This is the last page of the demonstration.</p>'],
                            default: '/enum/0'
                        }
                    }
                },
                'p--you-need-a-different-service': {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    id: 'http://localhost:3000/schema/definitions/you-need-a-different-service',
                    type: 'object',
                    title: 'You need a different service',
                    additionalProperties: false,
                    properties: {
                        'q-crimedetails': {
                            type: 'string',
                            classification: 'markup',
                            enum: [
                                '<p><strong>This service is currently a beta service.</strong></p><p>You must continue your application for compensation using a different service.</p>'
                            ],
                            default: '/enum/0'
                        }
                    }
                }
            },
            routes: {
                initial: 'p-applicant-are-you-a-british-citizen',
                states: {
                    'p-applicant-are-you-a-british-citizen': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p-applicant-over-18',
                                    cond: ['==', 'q-applicant-are-you-a-british-citizen', 'yes']
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: ['==', 'q-applicant-are-you-a-british-citizen', 'no']
                                }
                            ]
                        }
                    },
                    'p-applicant-over-18': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--who-is-applying',
                                    cond: ['==', 'q-are-you-18-or-over', 'yes']
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: ['==', 'q-are-you-18-or-over', 'no']
                                }
                            ]
                        }
                    },
                    'p--who-is-applying': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p-applicant-are-you-a-victim',
                                    cond: ['==', 'q-who-are-you-applying-for', 'myself']
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: ['==', 'q-who-are-you-applying-for', 'someone-else']
                                }
                            ]
                        }
                    },
                    'p-applicant-are-you-a-victim': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--number-of-attackers',
                                    cond: ['==', 'q-applicant-are-you-a-victim', 'yes']
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: ['==', 'q-applicant-are-you-a-victim', 'no']
                                }
                            ]
                        }
                    },
                    'p--number-of-attackers': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--attacker-name'
                                }
                            ]
                        }
                    },
                    'p--attacker-name': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--attacker-name',
                                    cond: [
                                        'answeredLessThan',
                                        'q-number-of-attackers',
                                        'q-number-of-attackers'
                                    ]
                                },
                                {
                                    target: 'p--end-of-demo'
                                }
                            ]
                        },
                        repeatable: true
                    },
                    'p--end-of-demo': {
                        on: {
                            ANSWER: []
                        }
                    },
                    'p--you-need-a-different-service': {
                        on: {
                            ANSWER: []
                        }
                    }
                }
            }
        };
    });

    describe('Given a path to a YAML file representing questionnaire routes', () => {
        it('should convert routes to a questionnaire template', () => {
            const options = {
                sourceFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };
            // const filePath = `./lib/__tests__/fixtures/${Math.random()}.json`;

            const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
            const questionnaire = JSON.parse(questionnaireTemplateJSON);
            expect(questionnaire).toEqual(simpleQuestionnaireTemplate);
        });

        it('should output the questionnaire template to a specified file', () => {
            const options = {
                sourceFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                outputFilePath: `${__dirname}/fixtures/output/test.json`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };

            // Create questionnaire and write it to file
            qTemplateGenerator.generate(options);

            // Read the written file contents and use this to see if things are as expected
            const writtenFileContents = fs.readFileSync(options.outputFilePath, 'utf8');
            const questionnaire = JSON.parse(writtenFileContents);

            // clean up file
            fs.unlinkSync(options.outputFilePath);

            expect(questionnaire).toEqual(simpleQuestionnaireTemplate);
        });

        it('should insert the repeatable attribute where appropriate', () => {
            const routesResult = simpleQuestionnaireTemplate.routes;

            const options = {
                sourceFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };

            const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
            const {routes} = JSON.parse(questionnaireTemplateJSON);

            expect(routes.states['p--attacker-name'].repeatable).toEqual(
                routesResult.states['p--attacker-name'].repeatable
            );
        });

        it('should absolutise the condition operands', () => {
            const routesResult = {
                initial: 'p-applicant-are-you-a-british-citizen',
                states: {
                    'p-applicant-are-you-a-british-citizen': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p-applicant-over-18',
                                    cond: [
                                        '$.p-applicant-are-you-a-british-citizen.q-applicant-are-you-a-british-citizen.value',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '$.p-applicant-are-you-a-british-citizen.q-applicant-are-you-a-british-citizen.value',
                                        'false'
                                    ]
                                }
                            ]
                        }
                    },
                    'p-applicant-over-18': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--who-is-applying',
                                    cond: [
                                        '$.p-applicant-over-18.q-are-you-18-or-over.value',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '$.p-applicant-over-18.q-are-you-18-or-over.value',
                                        'false'
                                    ]
                                }
                            ]
                        }
                    },
                    'p--who-is-applying': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p-applicant-are-you-a-victim',
                                    cond: [
                                        '$.p--who-is-applying.q-who-are-you-applying-for.value',
                                        'myself'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '$.p--who-is-applying.q-who-are-you-applying-for.value',
                                        'someone-else'
                                    ]
                                }
                            ]
                        }
                    },
                    'p-applicant-are-you-a-victim': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--number-of-attackers',
                                    cond: [
                                        '$.p-applicant-are-you-a-victim.q-applicant-are-you-a-victim.value',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '$.p-applicant-are-you-a-victim.q-applicant-are-you-a-victim.value',
                                        'false'
                                    ]
                                }
                            ]
                        }
                    },
                    'p--number-of-attackers': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--attacker-name',
                                    cond: []
                                }
                            ]
                        }
                    },
                    'p--attacker-name': {
                        on: {
                            ANSWER: [
                                {
                                    target: 'p--attacker-name',
                                    cond: [
                                        '$.p--number-of-attackers.q-number-of-attackers.value',
                                        '$.p--number-of-attackers.q-number-of-attackers.value'
                                    ]
                                },
                                {
                                    target: 'p--end-of-demo',
                                    cond: []
                                }
                            ]
                        },
                        repeatable: true
                    },
                    'p--end-of-demo': {
                        on: {
                            ANSWER: []
                        }
                    },
                    'p--you-need-a-different-service': {
                        on: {
                            ANSWER: []
                        }
                    }
                }
            };

            const options = {
                sourceFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                outputFilePath: `${__dirname}/fixtures/output/test.json`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };

            qTemplateGenerator.generate(options);
            qTemplateGenerator.absolutiseConditionPaths(options.outputFilePath);

            const questionnaireRaw = fs.readFileSync(options.outputFilePath, 'utf-8');
            const questionnaire = JSON.parse(questionnaireRaw, null, 4);

            expect(routesResult).toEqual(questionnaire.routes);
        });
    });
});
