import * as assert from 'assert';
import { stringsList } from '../../strings';

suite('String Utilities', function () {
  test('Values passed compile correctly', function () {
    const strings = ['a', 'b', 'c'];
    assert(stringsList(strings), 'a\nb\nc');
  });

  test('Empty strings are filtered out', function () {
    const strings = ['a', '', 'b', 'c', '', ''];
    assert(stringsList(strings), 'a\nb\nc');
  });
});
