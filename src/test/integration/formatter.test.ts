import { strictEqual } from 'assert';
import { CancellationTokenSource } from 'vscode';
import { getFormattedText, getFormattedTextParams } from '../../formatter';
import { execPromise, FIXTURES_PATH } from '../utils';

/**
 * Creates the parameter object for running getFormattedText() with defaults.
 */
function configFactory(overrides: {}): getFormattedTextParams {
  return {
    execFolder: './vendor/bin/',
    standard: 'PSR2',
    text: '',
    formatOptions: { insertSpaces: true, tabSize: 2 },
    cwd: FIXTURES_PATH,
    token: new CancellationTokenSource().token,
    isFullDocument: true,
    ...overrides,
  };
}

suite('Formatting', function () {
  suite('getFormattedText()', function () {
    suiteSetup(async function () {
      this.timeout(0);
      await execPromise('composer install', { cwd: FIXTURES_PATH });
    });

    test('Whole document formatting', async function () {
      const config = configFactory({
        text: `<?php
interface MyInterface { $property; }`,
      });

      const resultPlain = await getFormattedText(config);
      strictEqual(
        resultPlain,
        `<?php
interface MyInterface
{
    $property;
}
`,
        'The whole document should be formatted as expected.',
      );

      config.excludes = [
        'PSR2.Classes.ClassDeclaration',
      ];
      strictEqual(
        await getFormattedText(config),
        resultPlain,
        'The `excludes` key should not affect formatting.',
      );
    });

    test('Test pure partial formatting', async function () {
      const result = await getFormattedText(configFactory({
        text: 'interface MyInterface { $property; }',
        isFullDocument: false,
      }));

      strictEqual(
        result,
        `interface MyInterface
{
    $property;
}
`,
      );
    });

    test('Test partial formatting with excludes', async function () {
      const result = await getFormattedText(configFactory({
        text: 'interface MyInterface { $property; }',
        excludes: [
          'PSR2.Classes.ClassDeclaration',
        ],
        isFullDocument: false,
      }));

      strictEqual(
        result,
        `interface MyInterface { $property;
}
`,
      );
    });

    test('Test indented partial formatting', async function () {
      const result = await getFormattedText(configFactory({
        text: `    function a($b){
    $foo = "a";

    $bar = call( $foo); }`,
        isFullDocument: false,
      }));

      strictEqual(
        result,
        `    function a($b)
    {
        $foo = "a";

        $bar = call($foo);
    }
`,
      );
    });

    test('Test cancellation', async function () {
      const cancellation = new CancellationTokenSource();
      const pendingResult = getFormattedText(configFactory({
        text: `<?php
interface MyInterface { $property; }`,
        token: cancellation.token,
      }));

      setTimeout(() => cancellation.cancel(), 2);

      strictEqual(await pendingResult, null);
    });
  });
});
