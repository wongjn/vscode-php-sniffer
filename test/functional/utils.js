/**
 * @file
 * Utilities for tests.
 */

const { languages } = require('vscode');
const { execPromise } = require('../utils');

/**
 * Tests whether there is a global PHPCS on the current machine.
 *
 * @return {Promise<boolean>}
 *   True if there is a phpcs in the current path.
 */
async function hasGlobalPHPCS() {
  try {
    await execPromise('phpcs --version');
    return true;
  } catch (error) {
    return false;
  }
}

module.exports.hasGlobalPHPCS = hasGlobalPHPCS;

/**
 * Get diagnostics for a file.
 *
 * @param {import('vscode').Uri} fileUri
 *   The URI of the file to get diagnostics of.
 * @return {Promise<import('vscode').Diagnostic[]>}
 *   Diagnostics for the file.
 */
module.exports.getNextDiagnostics = (fileUri) => {
  const existingCount = languages.getDiagnostics(fileUri).length;

  return new Promise((resolve) => {
    const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
      const list = uris.map((uri) => uri.toString());
      if (list.indexOf(fileUri.toString()) === -1) return;

      const diagnostics = languages.getDiagnostics(fileUri);
      if (diagnostics.length !== existingCount) {
        resolve(diagnostics);
        subscription.dispose();
      }
    });
  });
};
