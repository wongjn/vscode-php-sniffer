/**
 * @file
 * Utilities for tests.
 */

import { exec, ExecOptions } from 'child_process';
import * as assert from 'assert';
import * as path from 'path';
import { IHookCallbackContext } from 'mocha';
import {
  commands, languages, window, workspace, Uri,
} from 'vscode';

/**
 * Executes a CLI command with promised result.
 *
 * @param command
 *   The CLI command to run.
 * @return
 *   The Promise that resolves with the stdout of the command.
 */
export function execPromise(command: string, options: ExecOptions = {}): Thenable<string> {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

/**
 * Tests whether there is a global PHPCS on the current machine.
 *
 * @return
 *   True if there is a phpcs in the current path.
 */
export async function hasGlobalPHPCS(): Promise<boolean> {
  try {
    await execPromise('phpcs --version');
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

/**
 * Fixture directory.
 */
export const FIXTURES = path.resolve(__dirname, '../../../src/test/functional/fixtures');

interface hookCallback {
  (this: IHookCallbackContext): void;
}
interface testCaseSetup {
  (this: IHookCallbackContext, fileUri: Uri): Thenable<hookCallback> | void;
}

/**
 * Test case function call.
 *
 * @param description
 *   Description of the suite. Must also match the test file, transformed to
 *   lowercase and non-word characters replaced with dashes, e.g
 *   `My test` → `my-test.php`.
 * @param expectedValidationErrors
 *   Expected number of errors that should be should in diagnostics.
 * @param expectedFormattedResult
 *   Expected file content after running formatting.
 * @param testSetup
 *   Optional function to run on suiteSetup, with an optional returned function
 *   to run on teardown.
 */
export function testCase(
  description: string,
  expectedValidationErrors: number,
  expectedFormattedResult: string,
  testSetup: testCaseSetup | null = null,
): void {
  suite(description, function () {
    // Construct the test file URI object.
    const fileUri = Uri.file(
      path.join(
        FIXTURES,
        `${description.toLowerCase().replace(/\W/g, '-')}.php`,
      ),
    );
    // Possible teardown callback.
    let tearDown: hookCallback | void;

    suiteSetup(async function () {
      if (testSetup) tearDown = await testSetup.call(this, fileUri);
    });

    suiteTeardown(async function () {
      if (tearDown) await tearDown.call(this);
    });

    test('Validation errors are reported', function (done) {
      const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
        const list = uris.map(uri => uri.toString());
        if (list.indexOf(fileUri.toString()) === -1) return;

        assert.strictEqual(
          languages.getDiagnostics(fileUri).length,
          expectedValidationErrors,
        );

        subscription.dispose();
        done();
      });

      workspace.openTextDocument(fileUri);
    });

    test('Fixable validation errors are fixed via formatting', async function () {
      this.timeout(5000);

      // Visually open the document so commands can be run on it.
      const document = await workspace.openTextDocument(fileUri);
      await window.showTextDocument(document);

      // Format (should remove new line at end of the file).
      await commands.executeCommand('editor.action.formatDocument');
      assert.strictEqual(document.getText(), expectedFormattedResult);
      await commands.executeCommand('workbench.action.closeAllEditors');
    });
  });
}
