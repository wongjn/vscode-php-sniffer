import { workspace } from 'vscode';
import { execPromise, testCase, hasGlobalPHPCS } from './utils';

suite('PHP Sniffer Tests', function () {

  testCase(
    'Global executable with preset',
    'generic-error.php',
    2,
    `<?php $error = 1'a'; ?>`,
    async function () {
      if (!hasGlobalPHPCS()) this.skip();

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
      }
    },
  );

  testCase(
    'Global executable with local ruleset',
    'semicolon.php',
    1,
    `<?php $a = 1;\n`,
    async function (file) {
      if (!hasGlobalPHPCS()) this.skip();

      workspace
        .getConfiguration('phpSniffer', file)
        .update('standard', './phpcs-semicolon.xml');

      return () => workspace
        .getConfiguration('phpSniffer', file)
        .update('standard', undefined);
    },
  );
});
