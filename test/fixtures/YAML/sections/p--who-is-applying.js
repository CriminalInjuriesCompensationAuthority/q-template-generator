const output = {
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
};

module.exports = output;
