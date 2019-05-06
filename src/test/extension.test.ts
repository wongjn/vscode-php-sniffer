import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { commands, languages, TextDocument, window, workspace } from 'vscode';
import { execPromise, waitPromise } from './utils';

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
    const genericErrorFixturePath = path.join(projectFolder, 'generic-error.php');
    let genericErrorDocument: TextDocument;
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
      genericErrorDocument = await workspace.openTextDocument(genericErrorFixturePath);
    });

    suiteTeardown(function () {
      // Restore previous default_standard setting.
      const cmd = userSetDefault.length > 0
        ? `--config-set default_standard ${userSetDefault}`
        : '--config-delete default_standard';
      Promise.all([
        execPromise(`phpcs ${cmd}`),
        commands.executeCommand('workbench.action.closeAllEditors'),
      ]);
    });

    test('Validation errors are reported', async function () {
      // Give diagnostics a chance to run.
      await waitPromise(200);
      assert.strictEqual(languages.getDiagnostics(genericErrorDocument.uri).length, 2);
    });

    test('Fixable validation errors are fixed via formatting', async function () {
      this.timeout(5000);

      // Visually open the document so commands can be run on it.
      await window.showTextDocument(genericErrorDocument);

      // Format (should remove new line at end of the file).
      await commands.executeCommand('editor.action.formatDocument');
      assert.strictEqual(genericErrorDocument.getText(), `<?php $error = 1'a'; ?>`);
    });

    suite('Global composer with local ruleset', function () {
      const semicolonFixturePath = path.join(projectFolder, 'semicolon.php');
      let semicolonDocument: TextDocument;

      suiteSetup(async function () {
        semicolonDocument = await workspace.openTextDocument(semicolonFixturePath);
        return workspace
          .getConfiguration('phpSniffer', semicolonDocument.uri)
          .update('standard', './phpcs-semicolon.xml');
      });

      suiteTeardown(function () {
        return Promise.all([
          workspace
            .getConfiguration('phpSniffer', semicolonDocument.uri)
            .update('standard', undefined),
          commands.executeCommand('workbench.action.closeActiveEditor'),
        ]);
      });

      test('Validation errors are reported', async function () {
        // Give diagnostics a chance to run.
        await waitPromise(200);
        assert.strictEqual(languages.getDiagnostics(semicolonDocument.uri).length, 1);
      });

      test('Fixable validation errors are fixed via formatting', async function () {
        this.timeout(5000);

        // Visually open the document so commands can be run on it.
        await window.showTextDocument(semicolonDocument);

        // Format.
        await commands.executeCommand('editor.action.formatDocument');
        assert.strictEqual(semicolonDocument.getText(), `<?php $a = 1;\n`);
      });
    });
  });
});
