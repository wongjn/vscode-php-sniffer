import { strictEqual } from 'assert';
import { CancellationTokenSource } from 'vscode';
import { resolve } from 'path';
import { execPromise, FIXTURES_PATH, ConfigMock } from '../utils';
import { validate } from '../../validator';

suite('Validation', function () {
  suite('validate()', function () {
    const config = new ConfigMock({
      standard: 'PSR12',
      executablesFolder: './vendor/bin/',
    });

    suiteSetup(async function () {
      this.timeout(0);
      await execPromise('composer install', { cwd: FIXTURES_PATH });
    });

    test('Normal run', async function () {
      const result = await validate(
        '<?php $a ="b"',
        new CancellationTokenSource().token,
        config,
        undefined,
        FIXTURES_PATH,
      );

      strictEqual(result!.totals.errors, 2);
    });

    test('Cancellation returns null', async function () {
      const cancellation = new CancellationTokenSource();
      const pending = validate(
        '<?php $a ="b"',
        cancellation.token,
        config,
        undefined,
        FIXTURES_PATH,
      );

      setTimeout(() => cancellation.cancel(), 2);
      strictEqual(await pending, null);
    });

    test('File path parameter', async function () {
      const testConfig = new ConfigMock({
        standard: './phpcs-semicolon.xml',
        executablesFolder: './vendor/bin/',
      });

      const result = await validate(
        '<?php $a ="b"',
        new CancellationTokenSource().token,
        testConfig,
        resolve(__dirname, '../../../src/test/fixtures/ignore-me/ignored.php'),
        FIXTURES_PATH,
      );

      strictEqual(
        result!.totals.errors + result!.totals.warnings,
        0,
        'Using fixtures/phpcs-semicolon.xml, files in ignore-me/ should be ignored.',
      );
    });
  });
});
