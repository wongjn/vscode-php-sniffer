/**
 * @file
 * Contains the validator class.
 */

const debounce = require('lodash.debounce');
const { languages, window, workspace, CancellationTokenSource, ProgressLocation, debug } = require('vscode');
const { reportFlatten } = require('./phpcs-report');
const { createRunner } = require('./runner');
const { createTokenManager } = require('./tokens');
const { getExtraFileSelectors } = require('./files');

/**
 * @typedef {import('vscode').Diagnostic} Diagnostic
 */

/**
 * Validator runtime object.
 *
 * @typedef {object} ValidatorRuntime
 *
 * @property {() => void} dispose
 *   Dispose the current validator listener.
 * @property {function(typeof import('vscode').workspace): void} setFromConfig
 *   VSCode editor workspace namespace API.
 * @property {function(import('vscode').TextDocument): void} validate
 *   Validates a text document.
 */

/**
 * Resets validator for new settings.
 *
 * @param {import('vscode').DiagnosticCollection} diagnostics
 *   Diagnostic collection.
 * @param {import('./tokens').TokenManager} tokenManager
 *   Token manager.
 * @param {ValidatorRuntime} validatorRuntime
 *   Text document validator runtime manager.
 */
function reset(diagnostics, tokenManager, validatorRuntime) {
  diagnostics.clear();
  tokenManager.clearTokens();
  validatorRuntime.dispose();

  if (workspace.getConfiguration('phpSniffer').get('run') !== 'never') {
    validatorRuntime.setFromConfig(workspace);
    workspace.textDocuments.forEach(validatorRuntime.validate);
  }
}

/**
 * Constructs a validator runtime object.
 *
 * @param {function(import('vscode').TextDocument): void} validate
 *   Text document validator.
 *
 * @return {ValidatorRuntime}
 *   The validator runtime.
 */
const createValidatorRuntime = (validate) => ({
  dispose() {},
  setFromConfig() {
    const config = workspace.getConfiguration('phpSniffer');

    const disposable = config.get('run', 'onSave') === 'onSave'
      ? workspace.onDidSaveTextDocument(validate)
      : workspace.onDidChangeTextDocument(
        debounce(({ document }) => { validate(document); }, config.get('onTypeDelay', 250)),
      );
    this.dispose = disposable.dispose.bind(disposable);
  },
  validate,
});

/**
 * Calls the given callback if the passed even affects validator running.
 *
 * @param {Function} callback
 *   The callback to run.
 *
 * @return {function(import('vscode').ConfigurationChangeEvent): void}
 *   The function to attached to workspace.onDidChangeConfiguration().
 */
const isRunAffect = (callback) => (event) => {
  if (
    !event.affectsConfiguration('phpSniffer')
    || !(event.affectsConfiguration('phpSniffer.run') || event.affectsConfiguration('phpSniffer.onTypeDelay'))
  ) {
    return;
  }

  callback();
};

/**
 * Removes a text document from diagnostics and tokens.
 *
 * @param {import('vscode').DiagnosticCollection} diagnostics
 *   Diagnostic collection.
 * @param {import('./tokens').TokenManager} tokenManager
 *   Token manager.
 *
 * @return {function(import('vscode').TextDocument): void} document
 *   The text document.
 */
const onDocumentClose = (diagnostics, tokenManager) => ({ uri }) => {
  diagnostics.delete(uri);
  tokenManager.discardToken(uri.fsPath);
};

/**
 * Whether validation should run for the given document.
 *
 * @param {import('vscode').TextDocument} document
 *   The document to validate.
 *
 * @return {boolean}
 *   True if validation should run, false otherwise.
 */
const shouldValidate = (document) => {
  const config = workspace.getConfiguration('phpSniffer', document.uri);

  return (
    !document.isClosed
    && (document.languageId === 'php' || languages.match(getExtraFileSelectors(), document) > 0)
    && (!config.get('disableWhenDebugging', false) || !debug.activeDebugSession)
  );
};

/**
 * Lints a document.
 *
 * @param {import('vscode').DiagnosticCollection} diagnostics
 *   Diagnostic collection.
 * @param {import('./tokens').TokenManager} tokenManager
 *   Token manager.
 *
 * @return {function(import('vscode').TextDocument): void}
 *   The validator function.
 */
const validateDocument = (diagnostics, tokenManager) => (document) => {
  if (!shouldValidate(document)) {
    return;
  }

  const token = tokenManager.registerToken(document.uri.fsPath);

  const text = document.getText();
  const resultPromise = createRunner(token, document.uri).phpcs(text);

  resultPromise
    .then((result) => {
      if (document.isClosed) {
        // Clear diagnostics on a closed document.
        diagnostics.delete(document.uri);
        // If the command was not cancelled.
      } else if (result !== null) {
        diagnostics.set(document.uri, reportFlatten(result, text));
      }
    })
    .catch((error) => {
      // Show all errors apart from global phpcs missing error, due to the
      // fact that this is currently the default base option and could be
      // quite noisy for users with only project-level sniffers.
      if (error.message !== 'spawn phpcs ENOENT') {
        window.showErrorMessage(
          error.message.endsWith(' ENOENT')
            ? 'Specified `phpcs` executable not found, please check your `executableFolder` setting.'
            : error.message,
        );
      }

      // Reset diagnostics for the document if there was an error.
      diagnostics.delete(document.uri);
    });

  window.withProgress(
    { location: ProgressLocation.Window, title: 'PHP Sniffer: validating…' },
    () => resultPromise,
  );
};

/**
 * Conditionally runs a function depending on the `run` config setting.
 *
 * @template {Function} T
 *
 * @param {T} fn
 *   The function to maybe run.
 * @return {T|(() => void)}
 *   The function to invoke.
 */
const maybeRun = (fn) => (...args) => (
  workspace.getConfiguration('phpSniffer').get('run') === 'never' ? () => {} : fn(...args)
);

/**
 * The validator.
 *
 * @return {import('vscode').Disposable}
 *   The disposable to dispose the validator.
 */
module.exports.createValidator = () => {
  const diagnostics = languages.createDiagnosticCollection('php');
  const tokenManager = createTokenManager(() => new CancellationTokenSource());

  const validate = validateDocument(diagnostics, tokenManager);
  const validatorRuntime = createValidatorRuntime(validate);
  const resetMe = reset.bind(null, diagnostics, tokenManager, validatorRuntime);

  const workspaceListeners = [
    workspace.onDidChangeConfiguration(isRunAffect(resetMe)),
    workspace.onDidOpenTextDocument(maybeRun(validate)),
    workspace.onDidCloseTextDocument(onDocumentClose(diagnostics, tokenManager)),
    workspace.onDidChangeWorkspaceFolders(resetMe),
  ];

  resetMe();

  return {
    dispose() {
      diagnostics.clear();
      diagnostics.dispose();
      validatorRuntime.dispose();
      tokenManager.clearTokens();
      workspaceListeners.forEach((listener) => listener.dispose());
    },
  };
};
