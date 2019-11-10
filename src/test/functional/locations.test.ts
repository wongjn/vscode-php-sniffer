import { workspace, Uri, languages } from 'vscode';
import { sep, join } from 'path';
import { testCase, hasGlobalPHPCS } from './utils';
import { execPromise, FIXTURES_PATH } from '../utils';

/**
 * Runs test cases for two files for preset and a local ruleset.
 */
function functionalTestSuiteRun() {
  testCase({
    description: 'Preset',
    content: '<?php class my_class {}\n',
    expectedValidationErrors: [
      { row: 0, column: 6 },
      { row: 0, column: 6 },
      { row: 0, column: 21 },
      { row: 0, column: 22 },
      { row: 0, column: 22 },
    ],
    expectedFormattedResult: '<?php class my_class\n{\n}\n',
    standard: 'PSR2',
  });

  testCase({
    description: 'Local ruleset',
    content: '<?php $b = 1 ; ?>\n',
    expectedValidationErrors: [
      { row: 0, column: 13 },
    ],
    expectedFormattedResult: '<?php $b = 1; ?>\n',
    standard: './phpcs-semicolon.xml',
  });
}

suite('Executable & ruleset locations', function () {
  suite('Global executable', function () {
    suiteSetup(async function () {
      if (!await hasGlobalPHPCS()) this.skip();
    });

    testCase({
      description: 'Use default_standard from global config',
      content: '<?php $b = 1 ; ?>\n',
      expectedValidationErrors: [
        { row: 0, column: 15 },
      ],
      expectedFormattedResult: '<?php $b = 1 ;\n',
      async testSetup() {
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
    });

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
