const yamlRoutes = require('../index.js')();
require('./fixtures/toMatchFixture.js');

describe('YAML rules to JSON', () => {
    describe('toJSON', () => {
        fit('should convert questionnaire rules as YAML to JSON', () => {
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
    });
});
