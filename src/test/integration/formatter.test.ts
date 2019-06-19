import { strictEqual } from 'assert';
import { CancellationTokenSource } from 'vscode';
import { formatterFactory } from '../../formatter';
import { execPromise, FIXTURES_PATH } from '../utils';

// Returns a cancellation token.
const getToken = () => new CancellationTokenSource().token;

suite('Formatting', function () {
  suite('formatterFactory()', function () {
    let configMock: {
      data: { [key: string]: any };
      get<T>(section: string, defaultValue: T): T;
    };

    suiteSetup(async function () {
      this.timeout(0);
      await execPromise('composer install', { cwd: FIXTURES_PATH });
    });

    setup(function () {
      configMock = {
        data: {
          standard: 'PSR2',
          executablesFolder: './vendor/bin/',
        },
        get<T>(key: string, defaultValue: T): T {
          return key in this.data ? this.data[key] : defaultValue;
        },
      };
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
