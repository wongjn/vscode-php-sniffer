/**
 * @file
 * Contains the Formatter class.
 */

const { Position, ProgressLocation, Range, TextEdit, window } = require('vscode');
const { processSnippet } = require('./strings');
const { createRunner } = require('./runner');

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
    const text = document.getText(range);

    const formatter = createRunner(token, document.uri, isFullDocument).phpcbf;

    const replacement = await window.withProgress(
      { location: ProgressLocation.Window, title: 'PHP Sniffer: formatting…' },
      () => (isFullDocument ? formatter(text) : processSnippet(text, formatOptions, formatter)),
    );

    return replacement ? [new TextEdit(range, replacement)] : [];
  },
};
