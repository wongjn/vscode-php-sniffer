import { TextDocument, workspace } from 'vscode';
import { SpawnOptions } from 'child_process';

/**
 * Parsed extension config shape.
 */
export interface PHPSnifferConfigInterface {
  /**
   * Path to the file being checked/formatted.
   */
  readonly filePath: string;

  /**
   * The `standard` argument to pass to the binary.
   */
  readonly standard: string;

  /**
   * The prefix string to add before the command.
   */
  readonly prefix: string;

  /**
   * `spawn` options.
   */
  readonly spawnOptions: SpawnOptions;
}

/**
 * Builds a quick config object reference for a document.
 */
export function getDocumentConfig(document: TextDocument): PHPSnifferConfigInterface {
  const VSConfig = workspace.getConfiguration('phpSniffer', document.uri);

  return {
    filePath: document.uri.scheme === 'file' ? document.uri.fsPath : '',
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
