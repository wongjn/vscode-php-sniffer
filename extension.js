/**
 * @file
 * Extension entry.
 */

const vscode = require('vscode');
const { Formatter } = require('./lib/formatter');
const { createValidator } = require('./lib/validator');

module.exports = {
  /**
   * Activates the extension.
   *
   * @param {import('vscode').ExtensionContext} context
   *   A collection of utilities private to the extension.
   */
  activate(context) {
    context.subscriptions.push(
      vscode.languages.registerDocumentRangeFormattingEditProvider(
        { language: 'php', scheme: 'file' },
        Formatter,
      ),
      createValidator(vscode),
    );
  },
};
