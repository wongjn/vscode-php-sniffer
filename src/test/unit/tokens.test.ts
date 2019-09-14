import { ok, strictEqual } from 'assert';
import { TokenSourceInterface, createTokenManager } from '../../tokens';
import { createStubToken } from '../utils';

/**
 * Creates a cancellation token source class.
 *
 * The class created is analogous to vscode.CancellationTokenSource but with a
 * stubbed token.
 *
 * @param cancelCallback
 *   A function to call when cancel() is called on an object instantiated by
 *   this class.
 * @param disposeCallback
 *   A function to call when dispose() is called on an object instantiated by
 *   this class.
 */
function createTokenSourceMockClass(
  cancelCallback: (() => void) | null = null,
  disposeCallback: (() => void) | null = null,
) {
  /* eslint-disable no-empty-function, class-methods-use-this */
  return class TokenSourceMock implements TokenSourceInterface {
    // eslint-disable-next-line no-useless-constructor
    constructor(public token = createStubToken()) { }

    public cancel() {
      if (cancelCallback) cancelCallback();
    }

    public dispose() {
      if (disposeCallback) disposeCallback();
    }
  };
  /* eslint-enable no-empty-function, class-methods-use-this */
}

suite('Token Manager from createTokenManager()', function () {
  test('Token registration', function () {
    let cancelled = false;
    let disposed = false;

    const TokenSourceMockClass = createTokenSourceMockClass(
      () => { cancelled = true; },
      () => { disposed = true; },
    );

    const tokenManager = createTokenManager(TokenSourceMockClass);
    const token = tokenManager.registerToken('key');
    ok('isCancellationRequested' in token, 'Token is given on registration call.');

    tokenManager.registerToken('key');
    ok(cancelled, 'Token cancellation should be called for duplicate key registration.');
    ok(disposed, 'Token source disposal should be called for duplicate key registration.');
  });

  test('Token cancellation', function () {
    let cancelled = false;
    let disposed = false;

    const TokenSourceMockClass = createTokenSourceMockClass(
      () => { cancelled = true; },
      () => { disposed = true; },
    );

    const tokenManager = createTokenManager(TokenSourceMockClass);
    tokenManager.registerToken('key');
    tokenManager.discardToken('key');

    ok(cancelled, 'Token cancellation should happen.');
    ok(disposed, 'Token source disposal should happen.');
  });

  test('Token clearing', function () {
    let cancelledCount = 0;
    let disposalCount = 0;

    const TokenSourceMockClass = createTokenSourceMockClass(
      () => { cancelledCount += 1; },
      () => { disposalCount += 1; },
    );

    const tokenManager = createTokenManager(TokenSourceMockClass);

    tokenManager.registerToken('foo');
    tokenManager.registerToken('bar');
    tokenManager.registerToken('baz');
    tokenManager.clearTokens();

    strictEqual(cancelledCount, 3, 'All tokens should be cancelled.');
    strictEqual(disposalCount, 3, 'All token sources should be disposed.');
  });
});
