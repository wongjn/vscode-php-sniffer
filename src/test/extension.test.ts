import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { commands, languages, TextDocument, window, workspace } from 'vscode';

function execPromise(command: string): Thenable<string> {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

function waitPromise(wait: number): Thenable<void> {
  return new Promise(resolve => {
    setTimeout(resolve, wait);
  });
}

suite('PHP Sniffer Tests', function () {
  const projectFolder = path.join(__dirname, 'project');
  const fixturesSource = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');

  suiteSetup(function () {
    fs.emptyDirSync(projectFolder);
    return fs.copy(fixturesSource, projectFolder);
  });

  suiteTeardown(function () {
    return fs.emptyDir(projectFolder);
  });

  suite('Global executable usage', function () {
    const fixtureDocumentPath = path.join(projectFolder, 'generic-error.php');
    let document: TextDocument;
    let userSetDefault = '';

    suiteSetup(async function () {
      try {
        // Check phpcs is globally installed.
        const finder = process.platform === 'win32' ? 'where' : 'which';
        await new Promise((resolve, reject) => {
          exec(`${finder} phpcs`).on('close', code => code === 0 ? resolve() : reject());
        });
      }
      catch (e) {
        this.skip();
      }

      // Save user-set default_standard config option if there was any so that
      // it can be reverted back to later.
      const phpcsConfig = await execPromise('phpcs --config-show');
      const matches = phpcsConfig.match(/default_standard: (.+)/);
      if (matches) {
        userSetDefault = matches[1];
      }

      await execPromise('phpcs --config-set default_standard Generic');
      document = await workspace.openTextDocument(fixtureDocumentPath);
    });

    suiteTeardown(function () {
      // Restore previous default_standard setting.
      const cmd = userSetDefault.length > 0
        ? `--config-set default_standard ${userSetDefault}`
        : '--config-delete default_standard';
      return execPromise(`phpcs ${cmd}`);
    });

    test('Validation errors are reported', async function () {
      // Give diagnostics a chance to run.
      await waitPromise(500);
      assert.strictEqual(languages.getDiagnostics(document.uri).length, 2);
    });

    test('Fixable validation errors are fixed via formatting', async function () {
      this.timeout(5000);

      // Visually open the document so commands can be run on it.
      await window.showTextDocument(document);

      // Format (should remove new line at end of the file).
      await commands.executeCommand('editor.action.formatDocument');
      assert.strictEqual(document.getText(), `<?php $error = 1'a'; ?>`);
    });
  });
});
