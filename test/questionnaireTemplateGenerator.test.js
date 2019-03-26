const fs = require('fs');
const path = require('path');
const qTemplateGenerator = require('../lib/index')();

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function errorMessageToRegExp(errorMessage) {
    return new RegExp(`^${escapeRegExp(errorMessage)}$`);
}

describe('Questionnaire template generator', () => {
    let questionnaireTemplate;

    beforeEach(() => {
        questionnaireTemplate = {
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
                                    cond: [
                                        '==',
                                        '$.answers.p-applicant-are-you-a-british-citizen.q-applicant-are-you-a-british-citizen',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '==',
                                        '$.answers.p-applicant-are-you-a-british-citizen.q-applicant-are-you-a-british-citizen',
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
                                        '==',
                                        '$.answers.p-applicant-over-18.q-are-you-18-or-over',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '==',
                                        '$.answers.p-applicant-over-18.q-are-you-18-or-over',
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
                                        '==',
                                        '$.answers.p--who-is-applying.q-who-are-you-applying-for',
                                        'myself'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '==',
                                        '$.answers.p--who-is-applying.q-who-are-you-applying-for',
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
                                        '==',
                                        '$.answers.p-applicant-are-you-a-victim.q-applicant-are-you-a-victim',
                                        'true'
                                    ]
                                },
                                {
                                    target: 'p--you-need-a-different-service',
                                    cond: [
                                        '==',
                                        '$.answers.p-applicant-are-you-a-victim.q-applicant-are-you-a-victim',
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
                                        'p--attacker-name',
                                        '$.answers.p--number-of-attackers.q-number-of-attackers'
                                    ]
                                },
                                {
                                    target: 'p--end-of-demo'
                                }
                            ]
                        }
                        // TODO: Logic for auto repeatable insertion needs looked at. Un-comment when ready.
                        // ,repeatable: true
                    },
                    'p--end-of-demo': {},
                    'p--you-need-a-different-service': {}
                }
            }
        };
    });

    describe('Given a path to a YAML file representing questionnaire routes', () => {
        it('should convert routes to a questionnaire template', () => {
            const options = {
                questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };

            const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
            const questionnaire = JSON.parse(questionnaireTemplateJSON);
            expect(questionnaire).toEqual(questionnaireTemplate);
        });

        it('should output the questionnaire template to a specified file', () => {
            const options = {
                questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/test.yml`,
                outputFilePath: `${__dirname}/fixtures/_____test____.json`,
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

            expect(questionnaire).toEqual(questionnaireTemplate);
        });

        it('should accept a questionnaire file with resolved route definition references as input', () => {
            const options = {
                resolvedQuestionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/resolved/test-resolved.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`
            };

            const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
            const questionnaire = JSON.parse(questionnaireTemplateJSON);
            expect(questionnaire).toEqual(questionnaireTemplate);
        });

        // TODO: Logic for auto repeatable insertion needs looked at. Un-comment when ready.
        // it('should insert the repeatable attribute where appropriate', () => {
        //     const routesResult = {
        //         initial: 'a',
        //         states: {
        //             a: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'a',
        //                             cond: ['==', 1, 1]
        //                         },
        //                         {
        //                             target: 'b'
        //                         }
        //                     ]
        //                 }
        //             },
        //             b: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'c'
        //                         },
        //                         {
        //                             target: 'b'
        //                         },
        //                         {
        //                             target: 'z'
        //                         }
        //                     ]
        //                 }
        //             },
        //             c: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'd'
        //                         }
        //                     ]
        //                 }
        //             },
        //             d: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'e'
        //                         }
        //                     ]
        //                 }
        //             },
        //             e: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'c'
        //                         },
        //                         {
        //                             target: 'f',
        //                             cond: ['==', 1, 1]
        //                         }
        //                     ]
        //                 }
        //             },
        //             f: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'g'
        //                         },
        //                         {
        //                             target: 'a'
        //                         }
        //                     ]
        //                 }
        //             },
        //             g: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'h'
        //                         },
        //                         {
        //                             target: 'f'
        //                         }
        //                     ]
        //                 }
        //             },
        //             h: {
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'i'
        //                         }
        //                     ]
        //                 }
        //             },
        //             i: {
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'z'
        //                         }
        //                     ]
        //                 }
        //             },
        //             z: {
        //                 repeatable: true,
        //                 on: {
        //                     ANSWER: [
        //                         {
        //                             target: 'z',
        //                             cond: ['==', 1, 1]
        //                         }
        //                     ]
        //                 }
        //             }
        //         }
        //     };

        //     const options = {
        //         resolvedQuestionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/resolved/complex-repeatable-sections.yml`,
        //         sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`
        //     };
        //     const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
        //     const {routes} = JSON.parse(questionnaireTemplateJSON);

        //     expect(routes).toEqual(routesResult);
        // });

        it('should handle all valid JSON data types when processing route conditions', () => {
            const routesResult = {
                initial: 'a',
                states: {
                    a: {
                        on: {
                            ANSWER: [
                                {
                                    target: 'b',
                                    cond: [
                                        '==',
                                        '$.answers.a.q-a',
                                        {},
                                        1,
                                        true,
                                        false,
                                        'trick-q-id',
                                        null,
                                        [
                                            '==',
                                            '$.answers.b.q-b',
                                            ['==', '$.answers.c.q-c', '$.answers.d.q-d']
                                        ]
                                    ]
                                },
                                {
                                    target: 'd'
                                }
                            ]
                        }
                    },
                    b: {
                        on: {
                            ANSWER: [
                                {
                                    target: 'c'
                                }
                            ]
                        }
                    },
                    c: {
                        on: {
                            ANSWER: [
                                {
                                    target: 'd'
                                }
                            ]
                        }
                    },
                    d: {}
                }
            };

            const options = {
                resolvedQuestionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/resolved/convoluted-condition.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`
            };
            const questionnaireTemplateJSON = qTemplateGenerator.generate(options);
            const {routes} = JSON.parse(questionnaireTemplateJSON);

            expect(routes).toEqual(routesResult);
        });

        it('should throw if a section targets a section id that does not exist', () => {
            const options = {
                resolvedQuestionnaireMetadataFilePath: path.join(
                    __dirname,
                    '/fixtures/YAML/questionnaires/resolved/section-id-does-not-exist.yml'
                ),
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`
            };
            const rxExpectedError = errorMessageToRegExp(
                `Questionnaire goto statement targets a section id ("this-target-does-not-exist-in-the-routes") that does not exist ("- goto: this-target-does-not-exist-in-the-routes"). In file: ${
                    options.resolvedQuestionnaireMetadataFilePath
                }`
            );

            expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
        });

        it('should throw if a route condition contains a question id that does not exist', () => {
            const options = {
                resolvedQuestionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/resolved/question-id-does-not-exist-test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`
            };
            const rxExpectedError = errorMessageToRegExp(
                'Question id ("q-z") not found in any section'
            );

            expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
        });

        it('should throw if a routes file does not exist', () => {
            const options = {
                questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/missing-route-file-test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };
            const expectedPath = path.join(
                options.routesDirPath,
                'p-this-id-does-not-have-a-corresponding-routes-file.yml'
            );
            const rxExpectedError = errorMessageToRegExp(
                `Route definition does not exist: "${expectedPath}"`
            );

            expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
        });

        it('should throw if a routes file does not contain the appropriate section id', () => {
            const options = {
                questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/missing-section-id-in-route-file-test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };
            const expectedPath = path.join(
                options.routesDirPath,
                'p-this-id-is-missing-in-route-definition.yml'
            );
            const rxExpectedError = errorMessageToRegExp(
                `Route definition ("${expectedPath}") does not contain section id: "p-this-id-is-missing-in-route-definition"`
            );

            expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
        });

        it('should throw if section JSON Schema file does not exist', () => {
            const options = {
                questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/resolved/section-json-schema-file-does-not-exist-test.yml`,
                sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                routesDirPath: `${__dirname}/fixtures/YAML/routes/`
            };
            const expectedPath = path.join(
                options.sectionsDirPath,
                'no-json-schema-file-for-this-section.js'
            );
            const rxExpectedError = errorMessageToRegExp(
                `Section JSON Schema definition does not exist: "${expectedPath}"`
            );

            expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
        });

        describe('Invalid route file YAML', () => {
            it('should throw if a routes file contains keys other than "goto" or "if"', () => {
                const options = {
                    questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/invalid-route-yaml-keys-test.yml`,
                    sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                    routesDirPath: `${__dirname}/fixtures/YAML/routes/`
                };

                const expectedPath = path.join(options.routesDirPath, 'p-invalid-yaml-keys.yml');
                const rxExpectedError = errorMessageToRegExp(
                    `Route definition ("${expectedPath}") contains invalid key(s): "go to", "If". Allowed keys: "goto", "if"`
                );

                expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
            });

            it('should throw if a routes file has more than one "goto" statement without a condition', () => {
                const options = {
                    questionnaireMetadataFilePath: `${__dirname}/fixtures/YAML/questionnaires/invalid-route-yaml-missing-condition.yml`,
                    sectionsDirPath: `${__dirname}/fixtures/YAML/sections/`,
                    routesDirPath: `${__dirname}/fixtures/YAML/routes/`
                };

                const expectedPath = path.join(
                    options.routesDirPath,
                    'p-invalid-yaml-missing-condition.yml'
                );
                const rxExpectedError = errorMessageToRegExp(
                    `Route definition ("${expectedPath}") has more than one "goto" statement without a condition ("if")`
                );

                expect(() => qTemplateGenerator.generate(options)).toThrow(rxExpectedError);
            });
        });
    });
});
