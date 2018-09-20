const diff = require('jest-diff');

/*
    Ignores indentation when performing a match.
    This allows multiline strings (``) to be used to describe fixtures/results and not worry
    about their indentation matching. Focuses on the content rather than whitespace.
*/
expect.extend({
    // https://github.com/facebook/jest/blob/master/packages/expect/src/matchers.js#L365
    toMatchFixture(received, expected) {
        const MULTILINE_REGEXP = /[\r\n]/;
        const indentation = /^\s+/gm;

        // https://github.com/facebook/jest/blob/master/packages/expect/src/utils.js#L254
        function isOneline(_expected, _received) {
            return (
                typeof _expected === 'string' &&
                typeof _received === 'string' &&
                (!MULTILINE_REGEXP.test(_expected) || !MULTILINE_REGEXP.test(_received))
            );
        }

        const receivedStrippedIndentation = received.replace(indentation, '');
        const expectedStrippedIndentation = expected.replace(indentation, '');

        // const pass = this.equals(received, expected);
        const pass = this.equals(receivedStrippedIndentation, expectedStrippedIndentation);
        const message = pass
            ? () =>
                  `${this.utils.matcherHint('.not.toEqual')}\n\n` +
                  `Expected value with indentation removed to equal:\n` +
                  `  ${this.utils.printExpected(expectedStrippedIndentation)}\n` +
                  `Received value with indentation removed:\n` +
                  `  ${this.utils.printReceived(receivedStrippedIndentation)}`
            : () => {
                  const oneline = isOneline(expected, received);
                  const diffString = diff(
                      expectedStrippedIndentation,
                      receivedStrippedIndentation,
                      {expand: this.expand}
                  );
                  return (
                      `${this.utils.matcherHint('.toEqual')}\n\n` +
                      `Expected value with indentation removed to equal:\n` +
                      `  ${this.utils.printExpected(expectedStrippedIndentation)}\n` +
                      `Received value with indentation removed:\n` +
                      `  ${this.utils.printReceived(receivedStrippedIndentation)}${
                          diffString && !oneline ? `\n\nDifference:\n\n${diffString}` : ''
                      }`
                  );
              };
        // Passing the the actual and expected objects so that a custom reporter
        // could access them, for example in order to display a custom visual diff,
        // or create a different error message
        return {actual: received, expected, message, name: 'toEqual', pass};
    }
});
