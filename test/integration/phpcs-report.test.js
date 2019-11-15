const { strictEqual, deepStrictEqual } = require('assert');
const { Diagnostic, DiagnosticSeverity, Range } = require('vscode');
const { PHPCSMessageType, reportFlatten } = require('../../lib/phpcs-report');

suite('Report Utilities', function () {
  suite('reportFlatten()', function () {
    test('Empty report returns an empty set', function () {
      const report = {
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
      };

      strictEqual(reportFlatten(report).length, 0);
    });

    test('A report is flattened correctly', function () {
      // Report taken from PHP_CodeSniffer Github wiki Reports page.
      // https://github.com/squizlabs/PHP_CodeSniffer/wiki/Reporting#printing-a-json-report
      const messages = [
        {
          message: 'Missing file doc comment',
          source: 'PEAR.Commenting.FileComment.Missing',
          severity: 5,
          type: PHPCSMessageType.ERROR,
          line: 2,
          column: 1,
          fixable: false,
        },
        {
          message: 'TRUE, FALSE and NULL must be lowercase; expected \'false\' but found \'FALSE\'',
          source: 'Generic.PHP.LowerCaseConstant.Found',
          severity: 5,
          type: PHPCSMessageType.ERROR,
          line: 4,
          column: 12,
          fixable: true,
        },
        {
          message: 'Line indented incorrectly; expected at least 4 spaces, found 1',
          source: 'PEAR.WhiteSpace.ScopeIndent.Incorrect',
          severity: 5,
          type: PHPCSMessageType.ERROR,
          line: 6,
          column: 2,
          fixable: true,
        },
        {
          message: 'Missing function doc comment',
          source: 'PEAR.Commenting.FunctionComment.Missing',
          severity: 5,
          type: PHPCSMessageType.ERROR,
          line: 9,
          column: 1,
          fixable: false,
        },
        {
          message: 'Inline control structures are discouraged',
          source: 'Generic.ControlStructures.InlineControlStructure.Discouraged',
          severity: 5,
          type: PHPCSMessageType.WARNING,
          line: 11,
          column: 5,
          fixable: true,
        },
      ];

      const report = {
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
      };

      const result = reportFlatten(report);
      strictEqual(result.length, 5);

      messages.forEach(({ line, column, source, message, type }, index) => {
        deepStrictEqual(
          result[index],
          new Diagnostic(
            new Range(line - 1, column - 1, line - 1, column - 1),
            `[${source}]\n${message}`,
            DiagnosticSeverity[type === PHPCSMessageType.WARNING ? 'Warning' : 'Error'],
          ),
        );
      });
    });
  });
});
