/**
 * @file
 * Utilities relating to files.
 */

const { workspace } = require('vscode');

/**
 * Returns the `extraFiles` configuration as an array of document filters.
 *
 * @return {import('vscode').DocumentFilter[]}
 *   Document filters.
 */
module.exports.getExtraFileSelectors = () => workspace
  .getConfiguration('phpSniffer')
  .get('extraFiles', [])
  .map((pattern) => ({ pattern, scheme: 'file' }));
