const path = require('path');
const { languages, Position, workspace, window, Uri } = require('vscode');
const { assertPosition, FIXTURES_PATH } = require('../utils');

/**
 * Listens to diagnostics and returns the next set for a file.
 *
 * @param {import('vscode').Uri} fileUri
 *   The URI of the file to get the next diagnostics for.
 *
 * @return {Promise<import('vscode').Diagnostic>}
 *   A promise that resolves to the next diagnostic.
 */
const getNextDiagnostic = (fileUri) => new Promise((resolve) => {
  const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
    const documentUri = uris.find((uri) => uri.toString() === fileUri.toString());
    if (!documentUri) return;

    subscription.dispose();
    resolve(languages.getDiagnostics(documentUri)[0]);
  });
});

suite('Diagnostic column index with tab indentation', function () {
  const fixturePath1 = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
  const fixturePath2 = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
  const fixtureUri1 = Uri.file(fixturePath1);
  const fixtureUri2 = Uri.file(fixturePath2);
  const textEncoder = new TextEncoder();

  suiteSetup(() => {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri1);

    return Promise.all([
      workspace.fs.writeFile(fixtureUri1, textEncoder.encode('<?php\n\t$foo = TRUE;\n')),
      workspace.fs.writeFile(fixtureUri2, textEncoder.encode('<?php\n\t$foo\t\t = TRUE\t\t;\n')),
      config.update('executablesFolder', './vendor/bin/'),
      config.update('standard', './tab-indent.xml'),
    ]);
  });

  suiteTeardown(() => {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri1);

    return Promise.all([
      workspace.fs.delete(fixtureUri1),
      workspace.fs.delete(fixtureUri2),
      config.update('executablesFolder', undefined),
      config.update('standard', undefined),
    ]);
  });

  test('Test 1', async function () {
    const editor = await window.showTextDocument(fixtureUri1);
    const nextDiagnostic = getNextDiagnostic(fixtureUri1);

    // Invoke a fresh validation run.
    editor.document.save();

    assertPosition((await nextDiagnostic).range.start, new Position(1, 8));
  });

  test('Test 2', async function () {
    const editor = await window.showTextDocument(fixtureUri2);
    const nextDiagnostic = getNextDiagnostic(fixtureUri2);

    // Invoke a fresh validation run.
    editor.document.save();

    assertPosition((await nextDiagnostic).range.start, new Position(1, 10));
  });
});
