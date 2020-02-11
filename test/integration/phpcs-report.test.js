const { strictEqual } = require('assert');
const { DiagnosticSeverity, Position, Range } = require('vscode');
const { assertPosition } = require('../utils');
const { reportFlatten } = require('../../lib/phpcs-report');

suite('Report Utilities', function () {
  suite('reportFlatten()', function () {
    test('Empty report returns an empty set', function () {
      const report = {
        vscodeOptions: { tabWidth: 1 },
        result: {
          files: {
            'file/path.php': {
              errors: 0,
              warnings: 0,
              messages: [],
            },
          },
          totals: {
            errors: 0,
            warnings: 0,
            fixable: 0,
          },
        },
      };

      strictEqual(reportFlatten(report, 'a').length, 0);
    });

    test('A report is flattened correctly', function () {
      // Report taken from PHP_CodeSniffer Github wiki Reports page.
      // https://github.com/squizlabs/PHP_CodeSniffer/wiki/Reporting#printing-a-json-report
      const messages = [
        {
          message: 'Missing file doc comment',
          source: 'PEAR.Commenting.FileComment.Missing',
          severity: 5,
          type: 'ERROR',
          line: 2,
          column: 1,
          fixable: false,
        },
        {
          message: 'TRUE, FALSE and NULL must be lowercase; expected \'false\' but found \'FALSE\'',
          source: 'Generic.PHP.LowerCaseConstant.Found',
          severity: 5,
          type: 'ERROR',
          line: 4,
          column: 12,
          fixable: true,
        },
        {
          message: 'Line indented incorrectly; expected at least 4 spaces, found 1',
          source: 'PEAR.WhiteSpace.ScopeIndent.Incorrect',
          severity: 5,
          type: 'ERROR',
          line: 6,
          column: 2,
          fixable: true,
        },
        {
          message: 'Missing function doc comment',
          source: 'PEAR.Commenting.FunctionComment.Missing',
          severity: 5,
          type: 'ERROR',
          line: 9,
          column: 1,
          fixable: false,
        },
        {
          message: 'Inline control structures are discouraged',
          source: 'Generic.ControlStructures.InlineControlStructure.Discouraged',
          severity: 5,
          type: 'WARNING',
          line: 11,
          column: 5,
          fixable: true,
        },
      ];

      const report = {
        vscodeOptions: { tabWidth: 1 },
        result: {
          files: {
            'file/path.php': {
              errors: 4,
              warnings: 1,
              messages,
            },
          },
          totals: {
            errors: 4,
            warnings: 1,
            fixable: 3,
          },
        },
      };

      const result = reportFlatten(report, 'a\n'.repeat(10));
      strictEqual(result.length, 5);

      messages.forEach(({ line, column, source, message, type }, index) => {
        strictEqual(
          JSON.stringify(result[index].range),
          JSON.stringify(new Range(line - 1, column - 1, line - 1, column - 1)),
        );
        strictEqual(result[index].message, message);
        strictEqual(result[index].severity, DiagnosticSeverity[type === 'WARNING' ? 'Warning' : 'Error']);
        strictEqual(result[index].code, source);
      });
    });

    suite('Tabbed text position', function () {
      const toReport = (messages) => ({
        vscodeOptions: { tabWidth: 4 },
        result: { files: { 'file/path.php': { messages } } },
      });

      test('Tabs before position', function () {
        const message = {
          message: 'message',
          source: 'source',
          severity: 5,
          type: 'ERROR',
          line: 1,
          column: 5,
        };

        const [result] = reportFlatten(toReport([message]), '\tfoo bar');
        assertPosition(result.range.start, new Position(0, 1));
      });

      test('Tabs before and after position', function () {
        const message = {
          message: 'message',
          source: 'source',
          severity: 5,
          type: 'ERROR',
          line: 1,
          column: 5,
        };

        const [result] = reportFlatten(toReport([message]), '\tfoo bar\t200');
        assertPosition(result.range.start, new Position(0, 1));
      });

      test('Tabs with error at column 1', function () {
        const message = {
          message: 'message',
          source: 'source',
          severity: 5,
          type: 'ERROR',
          line: 1,
          column: 1,
        };

        const [result] = reportFlatten(toReport([message]), '\tfoo bar');
        assertPosition(result.range.start, new Position(0, 0));
      });
    });
  });
});
