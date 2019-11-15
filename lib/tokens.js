/**
 * @file
 * Token management.
 */

/**
 * Cancels, disposes and discards a token for the key.
 *
 * @callback TokenManagerDiscardToken
 *
 * @param {string} key
 *   The key of the corresponding token.
 *
 * @return {void}
 *
 * @todo Change type name to a namepath, inner function of TokenManager
 *   (TokenManager~DiscardToken) when microsoft/TypeScript#15715 is resolved.
 */

/**
 * Registers a token for a key, discarding the existing one if it exists.
 *
 * @callback TokenManagerRegisterToken
 *
 * @param {string} key
 *   The key for the corresponding token.
 *
 * @return {import('vscode').CancellationToken}
 *   A cancellation token.
 *
 * @todo Change type name to a namepath, inner function of TokenManager
 *   (TokenManager~RegisterToken) when microsoft/TypeScript#15715 is resolved.
 */

/**
 * Token manager.
 *
 * @typedef TokenManager
 *
 * @prop {TokenManagerDiscardToken} discardToken
 *   Cancels, disposes and discards a token a key.
 * @prop {TokenManagerRegisterToken} registerToken
 *   Registers a token for a key, discarding the existing one if it exists.
 * @prop {() => void} clearTokens
 *   Clears all tokens.
 */

/**
 * Creates a token manager object.
 *
 * @param {() => import('vscode').CancellationTokenSource} tokenSourceFactory
 *   A factory function that creates a token source.
 *
 * @return {TokenManager}
 *   The token manager object.
 */
const createTokenManager = (tokenSourceFactory) => {
  /** @type {Map<string,import('vscode').CancellationTokenSource>} */
  const activeTokens = new Map();

  return {
    discardToken(key) {
      const activeToken = activeTokens.get(key);

      if (activeToken) {
        activeToken.cancel();
        activeToken.dispose();

        activeTokens.delete(key);
      }
    },
    registerToken(key) {
      this.discardToken(key);

      const activeToken = tokenSourceFactory();
      activeTokens.set(key, activeToken);

      return activeToken.token;
    },
    clearTokens() {
      Array.from(activeTokens.keys()).forEach(this.discardToken, this);
    },
  };
};

module.exports.createTokenManager = createTokenManager;
