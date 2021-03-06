const output = {
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
};

module.exports = output;
