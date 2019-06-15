/**
 * @file
 * Utilities for tests.
 */

import { exec, ExecOptions } from 'child_process';
import * as assert from 'assert';
import * as path from 'path';
import { IHookCallbackContext } from 'mocha';
import {
  commands,
  Diagnostic,
  languages,
  window,
  workspace,
  Uri,
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
    return false;
  }
}

/**
 * Fixture directory.
 */
export const FIXTURES = path.resolve(__dirname, '../../../src/test/fixtures');

interface hookCallback {
  (this: IHookCallbackContext): void;
}

type testCaseSetup = {
  (this: IHookCallbackContext, fileUri: Uri): Thenable<hookCallback> | void;
}

type ValidationErrorLocation = {
  row: number,
  column: number,
};

/**
 * Test case function call.
 *
 * @param description
 *   Description of the suite.
 * @param file
 *   The test file to use, relative to the fixtures folder.
 * @param expectedValidationErrors
 *   Expected errors that should be should be in diagnostics.
 * @param expectedFormattedResult
 *   Expected file content after running formatting.
 * @param standard
 *   The standard to test with.
 * @param testSetup
 *   Optional function to run on suiteSetup, with an optional returned function
 *   to run on teardown.
 */
export function testCase(
  description: string,
  file: string,
  expectedValidationErrors: ValidationErrorLocation[],
  expectedFormattedResult: string,
  standard: string | undefined = undefined,
  testSetup: testCaseSetup | null = null,
): void {
  suite(description, function () {
    // Construct the test file URI object.
    const fileUri = Uri.file(path.join(FIXTURES, file));
    // Possible teardown callback.
    let tearDown: hookCallback | void;

    suiteSetup(async function () {
      await workspace
        .getConfiguration('phpSniffer', fileUri)
        .update('standard', standard);
      if (testSetup) tearDown = await testSetup.call(this, fileUri);
    });

    suiteTeardown(async function () {
      await workspace
        .getConfiguration('phpSniffer', fileUri)
        .update('standard', undefined);
      if (tearDown) await tearDown.call(this);
    });

    test('Validation errors are reported', async function () {
      const diagnosticsPromise = new Promise<Diagnostic[]>(resolve => {
        const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
          const list = uris.map(uri => uri.toString());
          if (list.indexOf(fileUri.toString()) === -1) return;
          subscription.dispose();
          resolve(languages.getDiagnostics(fileUri));
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
