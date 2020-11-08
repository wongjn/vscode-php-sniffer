const assert = require('assert');
const path = require('path');
const { commands, languages, Range, window, workspace, Uri } = require('vscode');
const { createFile, writeFile, unlink } = require('fs-extra');
const { execPromise, FIXTURES_PATH } = require('../utils');
const { getNextDiagnostics } = require('./utils');

/**
 * Constructs a promise that waits for the given length of time.
 *
 * @param {number} length
 *   The amount of milliseconds to wait.
 * @return {Promise<void>}
 *   Promise that resolves once `length` time has passed.
 */
const wait = (length) => new Promise((resolve) => setTimeout(resolve, length));

suite('Validator run', function () {
  this.timeout(5000);

  suiteSetup(async function () {
    this.timeout(60000);
    await execPromise('composer install --no-dev', { cwd: FIXTURES_PATH });

    const config = workspace.getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH));
    await config.update('executablesFolder', `vendor${path.sep}bin${path.sep}`);
    await config.update('standard', 'PSR2');
  });

  suiteTeardown(async function () {
    const config = workspace.getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH));
    await config.update('executablesFolder', undefined);
    await config.update('standard', undefined);
  });

  /** @type {Uri} */
  let fileUri;

  setup(async function () {
    const filePath = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
    fileUri = Uri.file(filePath);

    await createFile(filePath);
    return writeFile(filePath, '<?php class my_class {}\n');
  });

  teardown(() => {
    const config = workspace.getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH));

    return Promise.all([
      config.update('run', undefined),
      config.update('onTypeDelay', undefined),
      unlink(fileUri.fsPath),
      commands.executeCommand('workbench.action.closeAllEditors'),
    ]);
  });

  test('onSave', async function () {
    await workspace
      .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
      .update('run', 'onSave');

    const diagnosticsWatch0 = getNextDiagnostics(fileUri);
    const document = await workspace.openTextDocument(fileUri);

    assert.strictEqual((await diagnosticsWatch0).length, 5, 'Opening a document runs validation.');

    (await window.showTextDocument(document)).edit((edit) => {
      edit.replace(new Range(0, 12, 0, 20), 'MyClass');
    });

    await wait(700);
    assert.strictEqual(languages.getDiagnostics(fileUri).length, 5, 'Editing a document does not run validation.');

    const diagnosticsWatch2 = getNextDiagnostics(fileUri);
    document.save();
    assert.strictEqual((await diagnosticsWatch2).length, 4, 'Saving a document runs validation.');
  });

  test('onType (with onTypeDelay)', async function () {
    const config = workspace.getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH));
    await config.update('run', 'onType');
    await config.update('onTypeDelay', 1000);

    const diagnosticsWatch0 = getNextDiagnostics(fileUri);
    const document = await workspace.openTextDocument(fileUri);

    assert.strictEqual((await diagnosticsWatch0).length, 5, 'Opening a document runs validation.');

    const editor = await window.showTextDocument(document);

    let now;
    const diagnosticsWatch1 = getNextDiagnostics(fileUri);

    editor
      .edit((edit) => edit.replace(new Range(0, 12, 0, 20), 'MyClass'))
      .then(() => { now = Date.now(); });

    assert.strictEqual((await diagnosticsWatch1).length, 4, 'Validation runs after change.');
    assert(Date.now() - now > 1000, 'Validation ran after `onTypeDelay` elapsed.');
  });

  test('never', async function () {
    await workspace
      .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
      .update('run', 'never');

    const document = await workspace.openTextDocument(fileUri);

    await wait(700);
    assert.strictEqual(languages.getDiagnostics(fileUri).length, 0, 'No validation errors.');

    (await window.showTextDocument(document)).edit((edit) => {
      edit.replace(new Range(0, 12, 0, 20), 'MyClass');
    });

    await wait(700);
    assert.strictEqual(languages.getDiagnostics(fileUri).length, 0, 'No validation errors.');

    await wait(700);
    assert.strictEqual(languages.getDiagnostics(fileUri).length, 0, 'No validation errors.');
  });
});
