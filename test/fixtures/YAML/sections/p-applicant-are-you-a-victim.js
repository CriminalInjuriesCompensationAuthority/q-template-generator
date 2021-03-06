const output = {
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
};

module.exports = output;
