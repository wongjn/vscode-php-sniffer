const assert = require('assert');
const { createTokenManager } = require('../../lib/tokens');
const { createStubToken } = require('../utils');

/**
 * Creates a token source mock.
 */
function tokenSourceMockFactory() {
  const result = {
    cancelled: 0,
    disposed: 0,
  };

  return {
    tokenSource: {
      token: createStubToken(),
      cancel() {
        result.cancelled += 1;
      },
      dispose() {
        result.disposed += 1;
      },
    },
    reveal: () => result,
  };
}

suite('Token Manager from createTokenManager()', function () {
  test('Token registration', function () {
    const mock = tokenSourceMockFactory();

    const tokenManager = createTokenManager(() => mock.tokenSource);
    const token = tokenManager.registerToken('key');
    assert.ok('isCancellationRequested' in token, 'Token is given on registration call.');

    tokenManager.registerToken('key');

    const result = mock.reveal();
    assert.strictEqual(result.cancelled, 1, 'Token cancellation should be called for duplicate key registration.');
    assert.strictEqual(result.disposed, 1, 'Token source disposal should be called for duplicate key registration.');
  });

  test('Token cancellation', function () {
    const mock = tokenSourceMockFactory();

    const tokenManager = createTokenManager(() => mock.tokenSource);
    tokenManager.registerToken('key');
    tokenManager.discardToken('key');

    const result = mock.reveal();
    assert.strictEqual(result.cancelled, 1, 'Token cancellation should happen.');
    assert.strictEqual(result.disposed, 1, 'Token source disposal should happen.');
  });

  test('Token clearing', function () {
    const mock = tokenSourceMockFactory();

    const tokenManager = createTokenManager(() => mock.tokenSource);

    tokenManager.registerToken('foo');
    tokenManager.registerToken('bar');
    tokenManager.registerToken('baz');
    tokenManager.clearTokens();

    const result = mock.reveal();
    assert.strictEqual(result.cancelled, 3, 'All tokens should be cancelled.');
    assert.strictEqual(result.disposed, 3, 'All token sources should be disposed.');
  });
});
