import { deepEqual } from 'assert';
import { CliArguments } from '../../cli-arguments';

suite('CliArguments', function () {
  test('Values passed on instantiation compile correctly', function () {
    const args1 = new CliArguments(new Map([['a', 'b']]));
    deepEqual(args1.getAll(), ['--a=b'], 'Single argument works');

    const args2 = new CliArguments(new Map([['a', 'b'], ['c', 'd']]));
    deepEqual(args2.getAll(), ['--a=b', '--c=d'], 'Multiple arguments work');
  });

  test('Values added after instantiation compile correctly', function () {
    const args1 = new CliArguments()
      .set('a', 'b')
      .set('c', 'd');

    deepEqual(args1.getAll(), ['--a=b', '--c=d']);

    const args2 = new CliArguments(new Map([['a', 'b']])).set('c', 'd');
    deepEqual(args2.getAll(), ['--a=b', '--c=d']);
  });

  test('Only values that need quotes are quoted when requested', function () {
    const args = new CliArguments()
      .set('a', 'no-quotes')
      .set('b', 'needs quotes');

    deepEqual(args.getAll(true), ['--a=no-quotes', '--b="needs quotes"']);
  });
});
