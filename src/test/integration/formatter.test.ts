import { strictEqual } from 'assert';
import { CancellationTokenSource } from 'vscode';
import { formatterFactory } from '../../formatter';
import { execPromise, FIXTURES_PATH, ConfigMock } from '../utils';

// Returns a cancellation token.
const getToken = () => new CancellationTokenSource().token;

suite('Formatting', function () {
  suite('formatterFactory()', function () {
    const configMock = new ConfigMock({
      standard: 'PSR2',
      executablesFolder: './vendor/bin/',
    });

    suiteSetup(async function () {
      this.timeout(0);
      await execPromise('composer install', { cwd: FIXTURES_PATH });
    });

    test('Formatter formats text as expected', async function () {
      const text = `<?php
interface MyInterface { $property; }`;

      strictEqual(
        await formatterFactory(configMock, getToken(), FIXTURES_PATH)(text),
        `<?php
interface MyInterface
{
    $property;
}
`,
      );
    });

    test('Sniff exclusion works', async function () {
      const text = `<?php
interface MyInterface { $property; }`;

      strictEqual(
        await formatterFactory(
          configMock,
          getToken(),
          FIXTURES_PATH,
          ['PSR2.Classes.ClassDeclaration'],
        )(text),
        `<?php
interface MyInterface { $property;
}
`,
      );
    });

    test('Cancellation returns empty result', async function () {
      const cancellation = new CancellationTokenSource();

      const pendingResult = formatterFactory(
        configMock,
        cancellation.token,
        FIXTURES_PATH,
      )('<?php interface MyInterface { $property; }');

      setTimeout(() => cancellation.cancel(), 2);

      strictEqual(await pendingResult, '');
    });
  });
});
