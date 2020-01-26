const { workspace, Uri, languages } = require('vscode');
const path = require('path');
const { createFile, unlink } = require('fs-extra');
const { FIXTURES_PATH } = require('../utils');

suite('Error handling', function () {
  test('Validator should bubble PHPCS execution errors', async function () {
    const filePath = path.join(FIXTURES_PATH, `index${Math.floor(Math.random() * 3000)}.php`);
    const fixtureUri = Uri.file(filePath);
    await createFile(filePath);

    const config = workspace.getConfiguration('phpSniffer', fixtureUri);
    workspace.openTextDocument(fixtureUri);

    const assertionPromise = new Promise((resolve) => {
      const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
        const list = uris.map((uri) => uri.toString());
        if (list.indexOf(fixtureUri.toString()) === -1) return;

        // @todo Find some way to get error messages shown in VSCode UI.
        subscription.dispose();
        resolve();
      });
    });

    await config.update('standard', 'ASD');
    await assertionPromise;

    Promise.all([
      await config.update('standard', undefined),
      await unlink(filePath),
    ]);
    this.skip();
  });
});
