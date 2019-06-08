import { equal } from 'assert';
import { stringsList, getIndentation } from '../../strings';

suite('String Utilities', function () {
  suite('stringsList()', function () {
    test('Values passed compile correctly', function () {
      const strings = ['a', 'b', 'c'];
      equal(stringsList(strings), 'a\nb\nc');
    });

    test('Empty strings are filtered out', function () {
      const strings = ['a', '', 'b', 'c', '', ''];
      equal(stringsList(strings), 'a\nb\nc');
    });
  });

  suite('getIndentation()', function () {
    function testGetIndentation(eol: string): void {
      test('Space indent detection with empty line', function () {
        const result = getIndentation(
          `  Lorem${eol}  Ipsum  dolor${eol}${eol}  Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '  ');
      });

      test('Space indent detection with 1 line of indentation only', function () {
        const result = getIndentation(
          `    Lorem${eol}    Ipsum  dolor${eol}  ${eol}    Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '  ');
      });

      test('Space indent detection with a non-indented line', function () {
        const result = getIndentation(
          `    Lorem${eol}    Ipsum  dolor${eol}ABCD${eol}    Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '');
      });

      test('Tab indent detection with empty line', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}${eol}\tAmet${eol}${eol}`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '\t');
      });

      test('Tab indent detection with 1 line of indentation only', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}\t${eol}\tAmet`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '\t');
      });

      test('Tab indent detection with a non-indented line', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}ABCD${eol}\tAmet`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '');
      });
    }

    suite('LF line endings', function () {
      testGetIndentation('\n');
    });

    suite('CRLF line endings', function () {
      testGetIndentation('\r\n');
    });
  });
});
