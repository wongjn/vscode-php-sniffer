import { deepEqual } from 'assert';
import { mapToCliArgs } from '../../cli';

suite('CLI Utilities', function () {
  test('Values passed compile correctly', function () {
    const args1 = new Map([['a', 'b']]);
    deepEqual(mapToCliArgs(args1), ['--a=b']);

    const args2 = new Map([['a', 'b'], ['c', '1']]);
    deepEqual(mapToCliArgs(args2), ['--a=b', '--c=1']);

    const args3 = new Map([['a', 'b'], ['c', '']]);
    deepEqual(mapToCliArgs(args3), ['--a=b'], 'Entries with empty values should not be compiled.');

    const args4 = new Map([['a', 'b'], ['', '1']]);
    deepEqual(mapToCliArgs(args4), ['--a=b'], 'Entries with empty keys should not be compiled.');
  });

  test('Only values that need quotes are quoted when requested', function () {
    const args1 = new Map([
      ['a', 'no-quotes'],
      ['b', 'needs quotes'],
    ]);

    deepEqual(mapToCliArgs(args1), ['--a=no-quotes', '--b=needs quotes']);
    deepEqual(mapToCliArgs(args1, true), ['--a=no-quotes', '--b="needs quotes"']);
  });
});
