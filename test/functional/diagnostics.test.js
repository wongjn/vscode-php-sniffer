const assert = require('assert');
const path = require('path');
const { languages, Position, workspace, window, Uri } = require('vscode');
const { FIXTURES_PATH } = require('../utils');

/**
 * Asserts two positions are the same.
 *
 * @param {import('vscode').Position} actual
 *   The actual position.
 * @param {import('vscode').Position} expected
 *   The expected position to receive.
 */
function assertPosition(actual, expected) {
  assert.ok(expected.isEqual(actual), new assert.AssertionError({
    message: `Expected positions to be the same:

Line ${actual.line}, Character ${actual.character} != Line ${expected.line}, Character ${expected.character}
`,
    actual: { line: actual.line, character: actual.character },
    expected: { line: expected.line, character: expected.character },
    operator: 'assertPosition',
  }));
}

suite('Diagnostic column index with tab indentation', function () {
  const fixturePath = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
  const fixtureUri = Uri.file(fixturePath);

  suiteSetup(() => {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri);

    return Promise.all([
      workspace.fs.writeFile(fixtureUri, new TextEncoder().encode('<?php\n\t$foo = TRUE;\n')),
      config.update('executablesFolder', './vendor/bin/'),
      config.update('standard', './tab-indent.xml'),
    ]);
  });

  suiteTeardown(() => {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri);

    return Promise.all([
      workspace.fs.delete(fixtureUri),
      config.update('executablesFolder', undefined),
      config.update('standard', undefined),
    ]);
  });

  test('Test', async function () {
    const editor = await window.showTextDocument(fixtureUri);
    editor.options.insertSpaces = false;
    editor.options.tabSize = 5;

    const result = new Promise((resolve, reject) => {
      const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
        const documentUri = uris.find((uri) => uri.toString() === fixtureUri.toString());
        if (!documentUri) return;

        const [{ range: { start } }] = languages.getDiagnostics(documentUri);
        subscription.dispose();

        try {
          assertPosition(start, new Position(1, 8));
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    // Invoke a fresh validation run.
    editor.document.save();

    return result;
  });
});
