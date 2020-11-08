/**
 * @file
 * Utilities relating to files.
 */

const { workspace } = require('vscode');

/**
 * Returns the `extraFiles` configuration as an array of document selectors.
 *
 * @return {import('vscode').DocumentFilter[]}
 *   Document selectors.
 */
module.exports.getExtraFileSelectors = () => workspace
  .getConfiguration('phpSniffer')
  .get('extraFiles', [])
  .map((pattern) => ({ pattern, scheme: 'file' }));
