/**
 * @file
 * Configuration management.
 */

const { workspace } = require('vscode');

/**
 * Configuration object.
 *
 * @typedef PHPSnifferConfig
 *
 * @prop {string} filePath
 *   Path to the file being checked/formatted.
 * @prop {string} standard
 *   The `standard` argument to pass to the binary.
 * @prop {string} prefix
 *   The prefix string to add before the command.
 * @prop {import('child_process').SpawnOptions} spawnOptions
 *   Options to pass to `child_process.spawn`.
 */

/**
 * Builds a quick config object reference for a resource.
 *
 * @param {import('vscode').Uri} uri
 *   The URI of the file.
 *
 * @return {PHPSnifferConfig}
 *   A configuration object.
 */
function getResourceConfig(uri) {
  const VSConfig = workspace.getConfiguration('phpSniffer', uri);

  return {
    filePath: uri.scheme === 'file' ? uri.fsPath : '',
    standard: VSConfig.get('standard', ''),
    prefix: VSConfig.get('executablesFolder', ''),
    spawnOptions: {
      cwd: workspace.workspaceFolders && workspace.workspaceFolders[0].uri.scheme === 'file'
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined,
      shell: process.platform === 'win32',
    },
  };
}

module.exports.getResourceConfig = getResourceConfig;
