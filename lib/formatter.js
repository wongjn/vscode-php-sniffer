/**
 * @file
 * Contains the Formatter class.
 */

const { Position, ProgressLocation, Range, TextEdit, window, workspace } = require('vscode');
const { mapToCliArgs, executeCommand, CliCommandError } = require('./cli');
const { processSnippet } = require('./strings');
const { getResourceConfig } = require('./config');

/**
 * Tests whether a range is for the full document.
 *
 * @param {import('vscode').Range} range
 *   The range to test.
 * @param {import('vscode').TextDocument} document
 *   The document to test with.
 *
 * @return {boolean}
 *   `true` if the given `range` is the full `document`.
 */
function isFullDocumentRange(range, document) {
  const documentRange = new Range(
    new Position(0, 0),
    document.lineAt(document.lineCount - 1).range.end,
  );

  return range.isEqual(documentRange);
}

/**
 * A formatter function to format text via PHPCBF.
 *
 * @callback Format
 *
 * @param {string} text
 *   The string to format.
 *
 * @return {Promise<string>}
 *   A promise that resolves to the formatted text.
 *
 * @throws {Error}
 *   When there is an error with executing the formatting command.
 */

/**
 * Returns a formatting intermediary function.
 *
 * @param {import('vscode').CancellationToken} token
 *   A token that can be called to cancel the formatting.
 * @param {import('./config').PHPSnifferConfig} config
 *   The normalized configuration of the extension.
 * @param {string[]} [excludes=[]]
 *   An optional list of sniffs to exclude.
 *
 * @return {Format}
 *   The formatter function to format text via PHPCBF.
 */
function formatterFactory(token, { standard, prefix, spawnOptions, filePath }, excludes = []) {
  return async (text) => {
    const args = new Map([
      ['standard', standard],
      ['stdin-path', filePath],
    ]);

    if (excludes.length) {
      args.set('exclude', excludes.join(','));
    }

    try {
      // PHPCBF uses unconventional exit codes, see
      // https://github.com/squizlabs/PHP_CodeSniffer/issues/1270#issuecomment-272768413
      await executeCommand({
        command: `${prefix}phpcbf`,
        token,
        args: [...mapToCliArgs(args, !!spawnOptions.shell), '-'],
        stdin: text,
        spawnOptions,
      });
    } catch (error) {
      // Exit code 1 indicates all fixable errors were fixed correctly.
      if (error instanceof CliCommandError && error.exitCode === 1) {
        return error.stdout;
      }

      // Re-throw the error if it was not a 1 exit code.
      throw error;
    }

    return '';
  };
}

module.exports.formatterFactory = formatterFactory;

/**
 * Formatter provider.
 *
 * @type {import('vscode').DocumentRangeFormattingEditProvider}
 */
module.exports.Formatter = {
  /**
   * {@inheritDoc}
   */
  async provideDocumentRangeFormattingEdits(document, range, formatOptions, token) {
    const isFullDocument = isFullDocumentRange(range, document);
    const config = workspace.getConfiguration('phpSniffer', document.uri);
    const text = document.getText(range);

    const formatter = formatterFactory(
      token,
      getResourceConfig(document.uri),
      isFullDocument ? [] : config.get('snippetExcludeSniffs', []),
    );

    const replacement = await window.withProgress(
      { location: ProgressLocation.Window, title: 'PHP Sniffer: formatting…' },
      () => (isFullDocument ? processSnippet(text, formatOptions, formatter) : formatter(text)),
    );

    return replacement ? [new TextEdit(range, replacement)] : [];
  },
};
