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
    test('Space indent detection with empty line', function () {
      const result = getIndentation(
        [
          '  Lorem',
          '  Ipsum  dolor',
          '',
          '  Amet',
        ],
        {
          insertSpaces: true,
          tabSize: 2,
        },
      );

      equal(result!.replace.toString(), '/^(  ){1}/');
      equal(result!.indent, '  ');
    });

    test('Space indent detection with line of indentation only', function () {
      const result = getIndentation(
        [
          '    Lorem',
          '    Ipsum  dolor',
          '  ',
          '    Amet',
        ],
        {
          insertSpaces: true,
          tabSize: 2,
        },
      );

      equal(result!.replace.toString(), '/^(  ){1}/');
      equal(result!.indent, '  ');
    });

    test('Space indent detection with a non-indented line', function () {
      const result = getIndentation(
        [
          '    Lorem',
          '    Ipsum  dolor',
          'ABCD',
          '    Amet',
        ],
        {
          insertSpaces: true,
          tabSize: 2,
        },
      );

      equal(result, null);
    });

    test('Tab indent detection with empty line', function () {
      const result = getIndentation(
        [
          '\tLorem',
          '\tIpsum  dolor',
          '',
          '\tAmet',
        ],
        {
          insertSpaces: false,
          tabSize: 1,
        },
      );

      equal(result!.replace.toString(), '/^(\t){1}/');
      equal(result!.indent, '\t');
    });

    test('Tab indent detection with line of indentation only', function () {
      const result = getIndentation(
        [
          '\tLorem',
          '\tIpsum  dolor',
          '\t',
          '\tAmet',
        ],
        {
          insertSpaces: false,
          tabSize: 1,
        },
      );

      equal(result!.replace.toString(), '/^(\t){1}/');
      equal(result!.indent, '\t');
    });

    test('Tab indent detection with a non-indented line', function () {
      const result = getIndentation(
        [
          '\tLorem',
          '\tIpsum  dolor',
          'ABCD',
          '\tAmet',
        ],
        {
          insertSpaces: false,
          tabSize: 1,
        },
      );

      equal(result, null);
    });
  });
});
