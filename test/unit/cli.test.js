const { deepStrictEqual, rejects, strictEqual } = require('assert');
const { mapToCliArgs, executeCommand } = require('../../lib/cli');
const { createStubToken, createMockToken } = require('../utils');

suite('CLI Utilities', function () {
  suite('mapToCliArgs()', function () {
    test('Values passed compile correctly', function () {
      const args1 = new Map([['a', 'b']]);
      deepStrictEqual(mapToCliArgs(args1), ['--a=b']);

      const args2 = new Map([['a', 'b'], ['c', '1']]);
      deepStrictEqual(mapToCliArgs(args2), ['--a=b', '--c=1']);

      const args3 = new Map([['a', 'b'], ['c', '']]);
      deepStrictEqual(mapToCliArgs(args3), ['--a=b'], 'Entries with empty values should not be compiled.');

      const args4 = new Map([['a', 'b'], ['', '1']]);
      deepStrictEqual(mapToCliArgs(args4), ['--a=b'], 'Entries with empty keys should not be compiled.');
    });

    test('Only values that need quotes are quoted when requested', function () {
      const args1 = new Map([
        ['a', 'no-quotes'],
        ['b', 'needs quotes'],
      ]);

      deepStrictEqual(mapToCliArgs(args1), ['--a=no-quotes', '--b=needs quotes']);
      deepStrictEqual(mapToCliArgs(args1, true), ['--a=no-quotes', '--b="needs quotes"']);
    });
  });

  suite('executeCommand()', function () {
    test('Normal execution returns STDOUT', async function () {
      const result = await executeCommand({
        command: 'echo',
        token: createStubToken(),
        args: ['foobar'],
      });

      strictEqual(result, 'foobar\n');
    });

    test('Cancelling the execution via the token returns null', async function () {
      const token = createMockToken();

      const result = executeCommand({
        command: process.platform === 'win32' ? 'timeout' : 'sleep',
        token,
        args: ['10'],
      });

      token.cancel();
      strictEqual(await result, null);
    });

    test('Non-zero exit code rejects', function () {
      return rejects(
        executeCommand({
          command: './non-zero-exit',
          token: createStubToken(),
          spawnOptions: { cwd: __dirname },
        }),
        { message: 'foo\nbar' },
      );
    });

    test('Nonsense command rejects', function () {
      return rejects(
        executeCommand({
          command: 'foo-bar-baz',
          token: createStubToken(),
        }),
      );
    });

    test('Command with spaces', async function () {
      const result = await executeCommand({
        command: './command with spaces',
        token: createStubToken(),
        spawnOptions: {
          shell: process.platform === 'win32',
          cwd: __dirname,
        },
      });

      strictEqual(result, 'foo');
    });
  });
});
