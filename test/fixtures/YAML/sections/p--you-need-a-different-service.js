const output = {
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
};

module.exports = output;
