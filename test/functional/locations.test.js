const assert = require('assert');
const { commands, languages, window, workspace, Uri } = require('vscode');
const path = require('path');
const { createFile, writeFile, unlink } = require('fs-extra');
const { hasGlobalPHPCS } = require('./utils');
const { execPromise, FIXTURES_PATH } = require('../utils');

/**
 * Test case function call.
 *
 * @param {object} options
 *   Options for the test case.
 * @param {string} options.description
 *   Description of the suite.
 * @param {string} options.content
 *   The content of the file for validation and before formatting.
 * @param {{ row: number, column: number }[]} options.expectedValidationErrors
 *   Expected errors that should be should be in diagnostics.
 * @param {string} options.expectedFormattedResult
 *   Expected file content after running formatting.
 * @param {string} [options.standard]
 *   The standard to test with.
 * @param {Function} [options.testSetup]
 *   Optional function to run on suiteSetup, with an optional returned function
 *   to run on teardown.
 */
function testCase({
  description,
  content,
  expectedValidationErrors,
  expectedFormattedResult,
  standard,
  testSetup,
}) {
  const filePath = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
  const fileUri = Uri.file(filePath);

  suite(description, function () {
    // Possible teardown callback.
    let tearDown;

    suiteSetup(async function () {
      await Promise.all([
        createFile(filePath),
        workspace.getConfiguration('phpSniffer', fileUri).update('standard', standard),
      ]);

      await writeFile(filePath, content);
      if (testSetup) tearDown = await testSetup.call(this, fileUri);
    });

    suiteTeardown(async function () {
      await Promise.all([
        workspace.getConfiguration('phpSniffer', fileUri).update('standard', undefined),
        unlink(filePath),
      ]);
      if (tearDown) await tearDown.call(this);
    });

    test('Validation errors are reported', async function () {
      const diagnosticsPromise = new Promise((resolve) => {
        const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
          const list = uris.map((uri) => uri.toString());
          if (list.indexOf(fileUri.toString()) === -1) return;

          const diagnostics = languages.getDiagnostics(fileUri);
          if (diagnostics.length === 0) return;

          subscription.dispose();
          resolve(diagnostics);
        });
      });

      workspace.openTextDocument(fileUri);
      const diagnostics = await diagnosticsPromise;

      assert.strictEqual(
        diagnostics.length,
        expectedValidationErrors.length,
        'Correct number of diagnostics are created.',
      );
      diagnostics.forEach((diagnostic, i) => {
        const { row, column } = expectedValidationErrors[i];
        const { start } = diagnostic.range;

        assert.strictEqual(start.line, row, `Diagnostic ${i + 1} line number is correct`);
        assert.strictEqual(start.character, column, `Diagnostic ${i + 1} character position is correct`);
      });
    });

    test('Fixable validation errors are fixed via formatting', async function () {
      // Visually open the document so commands can be run on it.
      const document = await workspace.openTextDocument(fileUri);
      await window.showTextDocument(document);

      await commands.executeCommand('editor.action.formatDocument');
      assert.strictEqual(document.getText(), expectedFormattedResult);
      await commands.executeCommand('workbench.action.closeAllEditors');
    });
  });
}

/**
 * Runs test cases for two files for preset and a local ruleset.
 */
function functionalTestSuiteRun() {
  testCase({
    description: 'Preset',
    content: '<?php class my_class {}\n',
    expectedValidationErrors: [
      { row: 0, column: 6 },
      { row: 0, column: 6 },
      { row: 0, column: 21 },
      { row: 0, column: 22 },
      { row: 0, column: 22 },
    ],
    expectedFormattedResult: '<?php class my_class\n{\n}\n',
    standard: 'PSR2',
  });

  testCase({
    description: 'Local ruleset',
    content: '<?php $b = 1 ; ?>\n',
    expectedValidationErrors: [
      { row: 0, column: 13 },
    ],
    expectedFormattedResult: '<?php $b = 1; ?>\n',
    standard: './phpcs-semicolon.xml',
  });
}

suite('Executable & ruleset locations', function () {
  suite('Global executable', function () {
    suiteSetup(async function () {
      this.timeout(20000);
      if (!await hasGlobalPHPCS()) this.skip();
    });

    testCase({
      description: 'Use default_standard from global config',
      content: '<?php $b = 1 ; ?>\n',
      expectedValidationErrors: [
        { row: 0, column: 15 },
      ],
      expectedFormattedResult: '<?php $b = 1 ;\n',
      async testSetup() {
        // Save user-set default_standard config option if there was any so that
        // it can be reverted back to later.
        const phpcsConfig = await execPromise('phpcs --config-show');
        const matches = phpcsConfig.match(/default_standard: (.+)/);
        const userSetDefault = matches ? matches[1] : null;

        await execPromise('phpcs --config-set default_standard PSR2');

        return () => {
          // Restore previous default_standard setting.
          const cmd = userSetDefault
            ? `--config-set default_standard ${userSetDefault}`
            : '--config-delete default_standard';
          return execPromise(`phpcs ${cmd}`);
        };
      },
    });

    functionalTestSuiteRun();
  });

  suite('Local executable', function () {
    suiteSetup(async function () {
      this.timeout(60000);
      await execPromise('composer install --no-dev', { cwd: FIXTURES_PATH });
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
        .update('executablesFolder', `vendor${path.sep}bin${path.sep}`);
    });

    suiteTeardown(async function () {
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
        .update('executablesFolder', undefined);
    });

    functionalTestSuiteRun();
  });
});
