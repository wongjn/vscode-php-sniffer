import { strictEqual } from 'assert';
import * as path from 'path';
import {
  ConfigurationTarget,
  workspace,
  WorkspaceFoldersChangeEvent,
  Uri,
} from 'vscode';
import { getResourceConfig } from '../../config';

const onDidChangeWorkspaceFoldersPromise = () => new Promise<WorkspaceFoldersChangeEvent>(
  resolve => {
    const subscription = workspace.onDidChangeWorkspaceFolders(event => {
      subscription.dispose();
      resolve(event);
    });
  },
);

suite('Config', function () {
  suite('getResourceConfig()', async function () {
    const mainFolder = Uri.file(path.resolve(__dirname, '../../../src/test/integration/fixtures/config'));
    const subfolder = Uri.file(path.resolve(__dirname, '../../../src/test/integration/fixtures/config/subfolder'));
    const secondaryFolder = Uri.file(path.resolve(__dirname, '../../../src/test/integration/fixtures/config0'));

    let a: Uri;
    let b: Uri;
    let c: Uri;

    suiteSetup(async function () {
      // Set up workspace folders.
      const onChange = onDidChangeWorkspaceFoldersPromise();
      workspace.updateWorkspaceFolders(
        0, 0, { uri: mainFolder }, { uri: subfolder }, { uri: secondaryFolder },
      );
      await onChange;

      // Get URIs for our PHP document fixtures.
      [a, b, c] = (await workspace.findFiles('**/{a,b,c}', undefined, 3));

      // Get config.
      const aConfig = workspace.getConfiguration('phpSniffer', a);

      // Set config per document with different target.
      await Promise.all([
        aConfig.update('standard', 'A-Standard', ConfigurationTarget.Workspace),
        aConfig.update('executablesFolder', 'A-Folder', ConfigurationTarget.Workspace),
      ]);
    });

    suiteTeardown(async function () {
      const aConfig = workspace.getConfiguration('phpSniffer', a);

      // Revert configuration.
      await Promise.all([
        aConfig.update('standard', undefined, ConfigurationTarget.Workspace),
        aConfig.update('executablesFolder', undefined, ConfigurationTarget.Workspace),
      ]);

      // Revert workspace folders.
      const onRevert = onDidChangeWorkspaceFoldersPromise();
      workspace.updateWorkspaceFolders(0, 3);
      return onRevert;
    });

    test('Main document', function () {
      const result = getResourceConfig(a);
      strictEqual(result.filePath, a.fsPath);
      strictEqual(result.prefix, 'A-Folder');
      strictEqual(result.standard, 'A-Standard');
      strictEqual(result.spawnOptions.cwd, mainFolder.fsPath);
    });

    test('Document in a subfolder', function () {
      const result = getResourceConfig(b);
      strictEqual(result.filePath, b.fsPath);
      strictEqual(result.prefix, 'A-Folder');
      strictEqual(result.standard, 'B-Standard');
      strictEqual(result.spawnOptions.cwd, mainFolder.fsPath);
    });

    test('Document in a secondary workspace folder', function () {
      const result = getResourceConfig(c);
      strictEqual(result.filePath, c.fsPath);
      strictEqual(result.prefix, 'A-Folder');
      strictEqual(result.standard, 'C-Standard');
      strictEqual(result.spawnOptions.cwd, mainFolder.fsPath);
    });
  });
});
