/**
 * @file
 * Contains the Formatter class.
 */

const { languages, Position, ProgressLocation, Range, TextEdit, window, workspace } = require('vscode');
const { processSnippet } = require('./strings');
const { createRunner } = require('./runner');
const { getExtraFileSelectors } = require('./files');

/**
 * Gets a full range of a document.
 *
 * @param {import('vscode').TextDocument} document
 *   The document to get the full range of.
 *
 * @return {import('vscode').Range}
 *   The range that covers the whole document.
 */
const documentFullRange = (document) => new Range(
  new Position(0, 0),
  document.lineAt(document.lineCount - 1).range.end,
);

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
const isFullDocumentRange = (range, document) => range.isEqual(documentFullRange(document));

/**
 * Formatter provider for PHP files.
 *
 * @type {import('vscode').DocumentRangeFormattingEditProvider}
 */
module.exports.Formatter = {
  /**
   * {@inheritDoc}
   */
  async provideDocumentRangeFormattingEdits(document, range, formatOptions, token) {
    const isFullDocument = isFullDocumentRange(range, document);
    const text = document.getText(range);

    const formatter = createRunner(token, document.uri, isFullDocument).phpcbf;

    const replacement = await window.withProgress(
      { location: ProgressLocation.Window, title: 'PHP Sniffer: formatting…' },
      () => (isFullDocument ? formatter(text) : processSnippet(text, formatOptions, formatter)),
    );

    return replacement ? [new TextEdit(range, replacement)] : [];
  },
};

/**
 * Formatter provider for non-PHP files.
 *
 * @type {import('vscode').DocumentFormattingEditProvider}
 */
const GenericFormatter = {
  /**
   * {@inheritDoc}
   */
  provideDocumentFormattingEdits(document, formatOptions, token) {
    return module.exports.Formatter.provideDocumentRangeFormattingEdits(
      document,
      documentFullRange(document),
      formatOptions,
      token,
    );
  },
};

/**
 * Registers the generic formatter.
 *
 * @return {import('vscode').Disposable}
 *   Disposable for the formatter.
 */
const registerGenericFormatter = () => languages.registerDocumentFormattingEditProvider(
  getExtraFileSelectors(),
  GenericFormatter,
);

/**
 * Formatter provider for any file type.
 *
 * @return {import('vscode').Disposable}
 */
module.exports.activateGenericFormatter = () => {
  let formatter = registerGenericFormatter();

  const onConfigChange = workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('phpSniffer.extraFiles')) {
      formatter.dispose();
      formatter = registerGenericFormatter();
    }
  });

  return {
    dispose() {
      onConfigChange.dispose();
      formatter.dispose();
    },
  };
};
