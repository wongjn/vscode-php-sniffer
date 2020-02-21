const path = require('path');
const assert = require('assert');
const { CancellationTokenSource, Range, workspace, WorkspaceEdit, Uri } = require('vscode');
const { Formatter } = require('../../lib/formatter');
const { execPromise, FIXTURES_PATH } = require('../utils');

suite('Formatter', function () {
  const fixtureUri = Uri.file(path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`));
  const textEncoder = new TextEncoder();

  suiteSetup(async function () {
    this.timeout(60000);

    const config = workspace.getConfiguration('phpSniffer', fixtureUri);

    await execPromise('composer install --no-dev', { cwd: FIXTURES_PATH });

    await Promise.all([
      workspace.fs.writeFile(fixtureUri, textEncoder.encode('<?php\n$foo = TRUE;\n')),
      config.update('executablesFolder', `vendor${path.sep}bin${path.sep}`),
      config.update('standard', './tab-indent.xml'),
    ]);
  });

  suiteTeardown(function () {
    const config = workspace.getConfiguration('phpSniffer', fixtureUri);
    return Promise.all([
      workspace.fs.delete(fixtureUri),
      config.update('executablesFolder', undefined),
      config.update('standard', undefined),
    ]);
  });

  test('Document fragments can be formatted', async function () {
    const document = await workspace.openTextDocument(fixtureUri);

    const edits = await Formatter.provideDocumentRangeFormattingEdits(
      document,
      new Range(1, 0, 1, 12),
      { tabSize: 2, insertSpaces: true },
      new CancellationTokenSource().token,
    );

    assert.strictEqual(1, edits.length);

    const formatEdit = new WorkspaceEdit();
    formatEdit.set(fixtureUri, edits);
    await workspace.applyEdit(formatEdit);
    assert.strictEqual(document.getText(), '<?php\n$foo = true;\n');
  });
});
