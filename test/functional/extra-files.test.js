const path = require('path');
const assert = require('assert');
const { commands, window, workspace, Uri } = require('vscode');
const { execPromise, FIXTURES_PATH } = require('../utils');
const { getNextDiagnostics } = require('./utils');

suite('`extraFiles` handling', function () {
  const fixtureUri = Uri.file(path.join(FIXTURES_PATH, 'style.css'));
  const textEncoder = new TextEncoder();

  suiteSetup(function () {
    this.timeout(60000);

    const config = workspace.getConfiguration('phpSniffer', fixtureUri);
    return Promise.all([
      execPromise('composer install --no-dev', { cwd: FIXTURES_PATH }),
      workspace.fs.writeFile(fixtureUri, textEncoder.encode('a{margin : 0}')),
      config.update('executablesFolder', `vendor${path.sep}bin${path.sep}`),
      config.update('standard', './css.xml'),
      config.update('extraFiles', ['**/*.css']),
    ]);
  });

  suiteTeardown(function () {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri);
    return Promise.all([
      workspace.fs.delete(fixtureUri),
      config.update('executablesFolder', undefined),
      config.update('standard', undefined),
      config.update('extraFiles', undefined),
    ]);
  });

  teardown(() => commands.executeCommand('workbench.action.closeAllEditors'));

  test('Validation errors reported', async function () {
    const diagnosticsWatch = getNextDiagnostics(fixtureUri);
    workspace.openTextDocument(fixtureUri);

    assert.strictEqual(1, (await diagnosticsWatch).length);
  });

  test('Formatting is applied', async function () {
    const document = await workspace.openTextDocument(fixtureUri);
    await window.showTextDocument(document);
    await commands.executeCommand('editor.action.formatDocument');

    assert.strictEqual(document.getText(), 'a{margin: 0}');
  });
});
