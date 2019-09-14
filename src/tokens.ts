import { CancellationToken } from 'vscode';

/**
 * Constructor for a token source.
 */
interface TokenSourceConstructor {
  new(): TokenSourceInterface;
}

/**
 * A token source creates and controls a token.
 *
 * This is an interface which describes VSCode's CancellationTokenSource
 * built-in.
 */
export interface TokenSourceInterface {
  /**
   * The cancellation token of this source.
   */
  token: CancellationToken;

  /**
   * Signal cancellation on the token.
   */
  cancel(): void;

  /**
   * Dispose object and free resources.
   */
  dispose(): void;
}

/**
 * Token manager.
 */
export interface TokenManagerInterface {
  /**
   * Cancels, disposes and discards a token for the key.
   *
   * @param key
   *   The key of the corresponding token.
   */
  discardToken(key: string): void;

  /**
   * Registers a token for a key, discarding the existing one if it exists.
   *
   * @param key
   *   The key for the corresponding token.
   * @return
   *   A cancellation token.
   */
  registerToken(key: string): CancellationToken;

  /**
   * Clears all tokens.
   */
  clearTokens(): void;
}

/**
 * Creates a token manager object.
 *
 * @param TokenSourceClass
 *   The class to construct a token source.
 */
export const createTokenManager = <T extends TokenSourceConstructor>(TokenSourceClass: T)
  : TokenManagerInterface => {
  const activeTokens = new Map<string, TokenSourceInterface>();

  return {
    discardToken(key: string) {
      const activeToken = activeTokens.get(key);

      if (activeToken) {
        activeToken.cancel();
        activeToken.dispose();

        activeTokens.delete(key);
      }
    },
    registerToken(key: string): CancellationToken {
      this.discardToken(key);

      const activeToken = new TokenSourceClass();
      activeTokens.set(key, activeToken);

      return activeToken.token;
    },
    clearTokens() {
      Array.from(activeTokens.keys()).forEach(this.discardToken, this);
    },
  };
};
