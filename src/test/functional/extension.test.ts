import { workspace, Uri, languages } from 'vscode';
import { sep, join } from 'path';
import {
  execPromise, testCase, hasGlobalPHPCS, FIXTURES,
} from './utils';

suite('PHP Sniffer Tests', function () {
  testCase(
    'Global executable with preset',
    2,
    '<?php $error = 1\'a\'; ?>',
    async function () {
      if (!await hasGlobalPHPCS()) this.skip();

      // Save user-set default_standard config option if there was any so that
      // it can be reverted back to later.
      const phpcsConfig = await execPromise('phpcs --config-show');
      const matches = phpcsConfig.match(/default_standard: (.+)/);
      const userSetDefault = matches ? matches[1] : null;

      await execPromise('phpcs --config-set default_standard Generic');

      return () => {
        // Restore previous default_standard setting.
        const cmd = userSetDefault
          ? `--config-set default_standard ${userSetDefault}`
          : '--config-delete default_standard';
        execPromise(`phpcs ${cmd}`);
      };
    },
  );

  testCase(
    'Global executable with local ruleset',
    1,
    '<?php $a = 1;\n',
    async function (file) {
      if (!await hasGlobalPHPCS()) this.skip();

      workspace
        .getConfiguration('phpSniffer', file)
        .update('standard', './phpcs-semicolon.xml');

      return () => workspace
        .getConfiguration('phpSniffer', file)
        .update('standard', undefined);
    },
  );

  suite('Local executable', function () {
    suiteSetup(async function () {
      this.timeout(0);

      await execPromise('composer install --no-dev', { cwd: FIXTURES });
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES))
        .update('executablesFolder', `vendor${sep}bin${sep}`);
    });

    suiteTeardown(async function () {
      await workspace
        .getConfiguration('phpSniffer', Uri.file(FIXTURES))
        .update('executablesFolder', undefined);
    });

    testCase(
      'Local executable with preset',
      5,
      '<?php class my_class\n{\n}\n',
      async function (file) {
        await workspace
          .getConfiguration('phpSniffer', file)
          .update('standard', 'PSR2');

        return () => workspace
          .getConfiguration('phpSniffer', file)
          .update('standard', undefined);
      },
    );

    testCase(
      'Local executable with local ruleset',
      1,
      '<?php $b = 1;\n',
      async function (file) {
        await workspace
          .getConfiguration('phpSniffer', file)
          .update('standard', './phpcs-semicolon.xml');

        return () => workspace
          .getConfiguration('phpSniffer', file)
          .update('standard', undefined);
      },
    );
  });

  suite('Execution error reporting', function () {
    test('Validator should show PHPCS execution errors', async function () {
      const fixtureUri = Uri.file(join(FIXTURES, 'global-executable-with-preset.php'));
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
