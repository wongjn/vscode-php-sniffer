import { workspace, Uri, languages } from 'vscode';
import { sep, join } from 'path';
import { testCase, hasGlobalPHPCS } from './utils';
import { execPromise, FIXTURES_PATH } from '../utils';

/**
 * Runs test cases for two files for preset and a local ruleset.
 */
function functionalTestSuiteRun() {
  testCase(
    'Preset',
    'class.php',
    [
      { row: 0, column: 6 },
      { row: 0, column: 6 },
      { row: 0, column: 21 },
      { row: 0, column: 22 },
      { row: 0, column: 22 },
    ],
    '<?php class my_class\n{\n}\n',
    'PSR2',
  );

  testCase(
    'Local ruleset',
    'index.php',
    [
      { row: 0, column: 13 },
    ],
    '<?php $b = 1; ?>\n',
    './phpcs-semicolon.xml',
  );
}

suite('PHP Sniffer Tests', function () {
  suite('Global executable', function () {
    suiteSetup(async function () {
      if (await hasGlobalPHPCS()) this.skip();
    });

    testCase(
      'Use default_standard from global config',
      'index.php',
      [
        { row: 0, column: 15 },
      ],
      '<?php $b = 1 ;\n',
      undefined,
      async function () {
        // Save user-set default_standard config option if there was any so that
        // it can be reverted back to later.
        const phpcsConfig = await execPromise('phpcs --config-show');
        const matches = phpcsConfig.match(/default_standard: (.+)/);
        const userSetDefault = matches ? matches[1] : null;

        await execPromise('phpcs --config-set default_standard PSR2');

        return () => {
          // Restore previous default_standard setting.
          const cmd = userSetDefault
            ? `--config-set default_standard ${userSetDefault}`
            : '--config-delete default_standard';
          return execPromise(`phpcs ${cmd}`);
        };
      },
    );

    functionalTestSuiteRun();
  });

  suite('Local executable', function () {
    suiteSetup(async function () {
      await execPromise('composer install --no-dev', { cwd: FIXTURES_PATH });
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
        .update('executablesFolder', `vendor${sep}bin${sep}`);
    });

    suiteTeardown(async function () {
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES_PATH))
        .update('executablesFolder', undefined);
    });

    functionalTestSuiteRun();
  });

  suite('Execution error reporting', function () {
    test('Validator should show PHPCS execution errors', async function () {
      const fixtureUri = Uri.file(join(FIXTURES_PATH, 'index.php'));
      const config = workspace.getConfiguration('phpSniffer', fixtureUri);
      workspace.openTextDocument(fixtureUri);

      const assertionPromise = new Promise(resolve => {
        const subscription = languages.onDidChangeDiagnostics(({ uris }) => {
          const list = uris.map(uri => uri.toString());
          if (list.indexOf(fixtureUri.toString()) === -1) return;

          // @todo Find some way to get error messages shown in VSCode UI.
          subscription.dispose();
          resolve();
        });
      });

      await config.update('standard', 'ASD');
      await assertionPromise;
      await config.update('standard', undefined);
      this.skip();
    });
  });
});
