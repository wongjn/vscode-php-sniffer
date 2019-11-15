/**
 * @file
 * Extension entry.
 */

const { languages } = require('vscode');
const { Formatter } = require('./lib/formatter');
const { Validator } = require('./lib/validator');

module.exports = {
  /**
   * Activates the extension.
   *
   * @param {import('vscode').ExtensionContext} context
   *   A collection of utilities private to the extension.
   */
  activate(context) {
    context.subscriptions.push(
      languages.registerDocumentRangeFormattingEditProvider(
        { language: 'php', scheme: 'file' },
        Formatter,
      ),
      new Validator(),
    );
  },
};
