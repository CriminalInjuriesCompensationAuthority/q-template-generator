const output = {
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
};

module.exports = output;
