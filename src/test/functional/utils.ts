/**
 * @file
 * Utilities for tests.
 */

import * as assert from 'assert';
import * as path from 'path';
import { createFile, writeFile, unlink } from 'fs-extra';
import { IHookCallbackContext } from 'mocha';
import {
  commands,
  Diagnostic,
  languages,
  window,
  workspace,
  Uri,
} from 'vscode';
import { execPromise, FIXTURES_PATH } from '../utils';

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

type hookCallback = {
  (this: IHookCallbackContext): void;
}

type testCaseSetup = {
  (this: IHookCallbackContext, fileUri: Uri): Thenable<hookCallback> | void;
}

type ValidationErrorLocation = {
  row: number,
  column: number,
};

type TestCaseOptions = {
  description: string,
  content: string,
  expectedValidationErrors: ValidationErrorLocation[],
  expectedFormattedResult: string,
  standard?: string,
  testSetup?: testCaseSetup,
}

/**
 * Test case function call.
 *
 * @param description
 *   Description of the suite.
 * @param content
 *   The content of the file for validation and before formatting.
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
export function testCase({
  description,
  content,
  expectedValidationErrors,
  expectedFormattedResult,
  standard,
  testSetup,
}: TestCaseOptions): void {
  const filePath = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
  const fileUri = Uri.file(filePath);

  suite(description, function () {
    // Possible teardown callback.
    let tearDown: hookCallback | void;

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
      const diagnosticsPromise = new Promise<Diagnostic[]>(resolve => {
        const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
          const list = uris.map(uri => uri.toString());
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
