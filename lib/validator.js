/**
 * @file
 * Contains the validator class.
 */

const { CancellationTokenSource, languages, window, workspace } = require('vscode');
const debounce = require('lodash.debounce');
const { reportFlatten } = require('./phpcs-report');
const { mapToCliArgs, executeCommand } = require('./cli');
const { getResourceConfig } = require('./config');
const { createTokenManager } = require('./tokens');

/**
 * Configuration values of when to run the validator.
 *
 * @readonly
 * @enum {string}
 */
const runConfig = {
  save: 'onSave',
  type: 'onType',
};

/**
 * Validates text with PHPCS.
 *
 * @param {string} text
 *   The text of the document to validate.
 * @param {import('vscode').CancellationToken} token
 *   A token to cancel validation.
 * @param {import('./config').PHPSnifferConfig} config
 *   The configuration to run the validation.
 *
 * @return {Promise<import('./phpcs-report').PHPCSReport|null>}
 *   The report from PHPCS or `null` if cancelled.
 */
async function validate(text, token, { standard, filePath, prefix, spawnOptions }) {
  const args = new Map([
    ['report', 'json'],
    ['standard', standard],
    ['stdin-path', filePath],
  ]);

  const result = await executeCommand({
    command: `${prefix}phpcs`,
    token,
    stdin: text,
    args: [
      ...mapToCliArgs(args, !!spawnOptions.shell),
      // Exit with 0 code even if there are sniff warnings or errors so we can
      // use error callback for actual execution errors.
      '--runtime-set', 'ignore_warnings_on_exit', '1',
      '--runtime-set', 'ignore_errors_on_exit', '1',
      // Ensure quiet output to override any output settings from config.
      // Ensures we get JSON only.
      '-q',
      // Read stdin.
      '-',
    ],
    spawnOptions,
  });

  return result ? JSON.parse(result) : null;
}
module.exports.validate = validate;

/**
 * The validator.
 */
class Validator {
  /**
   * Constructs a validator.
   */
  constructor() {
    this._diagnosticCollection = languages.createDiagnosticCollection('php');

    /**
     * Token manager to cancel a current validation runs.
     *
     * @type {import('./tokens').TokenManager}
     */
    this._tokenManager = createTokenManager(() => new CancellationTokenSource());

    /**
     * Disposables for event listeners.
     *
     * @type {import('vscode').Disposable[]}
     */
    this._workspaceListeners = [
      workspace.onDidChangeConfiguration(this._onConfigChange, this),
      workspace.onDidOpenTextDocument(this._validate, this),
      workspace.onDidCloseTextDocument(this._onDocumentClose, this),
      workspace.onDidChangeWorkspaceFolders(this._refresh, this),
    ];

    this._refresh();
    this._setValidatorListener();
  }

  /**
   * Dispose this object.
   */
  dispose() {
    this._diagnosticCollection.clear();
    this._diagnosticCollection.dispose();
    if (this._validatorListener) this._validatorListener.dispose();
    this._workspaceListeners.forEach((listener) => listener.dispose());
    this._tokenManager.clearTokens();
  }

  /**
   * Reacts on configuration change.
   *
   * @param {import('vscode').ConfigurationChangeEvent} event
   *   The configuration change event.
   */
  _onConfigChange(event) {
    if (!event.affectsConfiguration('phpSniffer')) {
      return;
    }

    if (event.affectsConfiguration('phpSniffer.run') || event.affectsConfiguration('phpSniffer.onTypeDelay')) {
      this._setValidatorListener();
    }

    this._refresh();
  }

  /**
   * Reacts on document close event.
   *
   * @param {import('vscode').TextDocument} event
   *   The document close event.
   */
  _onDocumentClose({ uri }) {
    this._diagnosticCollection.delete(uri);
    this._tokenManager.discardToken(uri.fsPath);
  }

  /**
   * Sets the validation event listening.
   */
  _setValidatorListener() {
    if (this._validatorListener) {
      this._validatorListener.dispose();
    }

    const config = workspace.getConfiguration('phpSniffer');
    const run = config.get('run', runConfig.save);
    const delay = config.get('onTypeDelay', 250);

    if (run === runConfig.type) {
      const validator = debounce(({ document }) => { this._validate(document); }, delay);

      /**
       * The active validator listener.
       *
       * @type {import('vscode').Disposable}
       */
      this._validatorListener = workspace.onDidChangeTextDocument(validator);
    } else {
      this._validatorListener = workspace.onDidSaveTextDocument(this._validate, this);
    }
  }

  /**
   * Refreshes validation on any open documents.
   */
  _refresh() {
    this._diagnosticCollection.clear();
    this._tokenManager.clearTokens();

    workspace.textDocuments
      .filter(({ isClosed }) => !isClosed)
      .forEach(this._validate, this);
  }

  /**
   * Lints a document.
   *
   * @param {import('vscode').TextDocument} document
   *   The document to lint.
   */
  _validate(document) {
    if (document.languageId !== 'php' || document.isClosed) {
      return;
    }

    const token = this._tokenManager.registerToken(document.uri.fsPath);
    const resultPromise = validate(document.getText(), token, getResourceConfig(document.uri));

    resultPromise
      .then((result) => {
        if (document.isClosed) {
          // Clear diagnostics on a closed document.
          this._diagnosticCollection.delete(document.uri);
          // If the command was not cancelled.
        } else if (result !== null) {
          this._diagnosticCollection.set(document.uri, reportFlatten(result));
        }
      })
      .catch((error) => {
        // Show all errors apart from global phpcs missing error, due to the
        // fact that this is currently the default base option and could be
        // quite noisy for users with only project-level sniffers.
        if (error.message !== 'spawn phpcs ENOENT') {
          window.showErrorMessage(error.message);
        }

        // Reset diagnostics for the document if there was an error.
        this._diagnosticCollection.delete(document.uri);
      });

    window.setStatusBarMessage('PHP Sniffer: validating…', resultPromise);
  }
}

module.exports.Validator = Validator;
