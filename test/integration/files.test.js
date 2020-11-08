const assert = require('assert');
const { workspace } = require('vscode');
const { getExtraFileSelectors } = require('../../lib/files');

suite('getExtraFileSelectors()', function () {
  suiteSetup(function () {
    return workspace
      .getConfiguration('phpSniffer')
      .update('extraFiles', ['**/*.css', '**/*.md']);
  });

  suiteTeardown(function () {
    return workspace
      .getConfiguration('phpSniffer')
      .update('extraFiles', undefined);
  });

  test('Returns document filters', function () {
    assert.deepStrictEqual(
      getExtraFileSelectors(),
      [
        { scheme: 'file', pattern: '**/*.css' },
        { scheme: 'file', pattern: '**/*.md' },
      ],
    );
  });
});
