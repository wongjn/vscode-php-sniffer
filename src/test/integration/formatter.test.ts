import { strictEqual } from 'assert';
import { CancellationTokenSource } from 'vscode';
import { formatterFactory } from '../../formatter';
import { execPromise, FIXTURES_PATH, getConfigMock } from '../utils';

// Returns a cancellation token.
const getToken = () => new CancellationTokenSource().token;

suite('Formatting', function () {
  suite('formatterFactory()', function () {
    const configMock = getConfigMock({
      standard: 'PSR2',
      prefix: './vendor/bin/',
    });

    suiteSetup(async function () {
      this.timeout(0);
      await execPromise('composer install', { cwd: FIXTURES_PATH });
    });

    test('Formatter formats text as expected', async function () {
      const text = `<?php
interface MyInterface { $property; }`;

      strictEqual(
        await formatterFactory(getToken(), configMock)(text),
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
          getToken(),
          configMock,
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
        cancellation.token,
        configMock,
      )('<?php interface MyInterface { $property; }');

      setTimeout(() => cancellation.cancel(), 2);

      strictEqual(await pendingResult, '');
    });

    test('Formatting respects file paths', async function () {
      const text = '<?php a (FALSE);';

      const filePathConfigStub = getConfigMock({
        standard: '../integration/fixtures/exclude-lowercase-consts.xml',
        prefix: './vendor/bin/',
        filePath: '/foo/bar/baz/exclude/file.php',
      });
      strictEqual(
        await formatterFactory(
          getToken(),
          filePathConfigStub,
          ['PSR2.Classes.ClassDeclaration'],
        )(text),
        '<?php a(FALSE);',
      );
    });
  });
});
