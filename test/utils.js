const assert = require('assert');
const { exec } = require('child_process');
const path = require('path');

/**
 * Executes a CLI command with promised result.
 *
 * @param {string} command
 *   The CLI command to run.
 * @param {import('child_process').ExecOptions} options
 *   Any options to pass to `child_process.exec()`.
 *
 * @return {Promise<string>}
 *   The Promise that resolves with the stdout of the command.
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

module.exports.execPromise = execPromise;

/**
 * Fixtures directory.
 */
const FIXTURES_PATH = path.join(__dirname, '/fixtures');
module.exports.FIXTURES_PATH = FIXTURES_PATH;

/**
 * Returns a sample config for tests.
 *
 * @param {Object} opts
 *   Options to override the stub with.
 * @param {string} [opts.filePath]
 *   Path to the file being checked/formatted.
 * @param {string} [opts.standard]
 *   The `standard` argument to pass to the binary.
 * @param {string} [opts.prefix]
 *   The prefix string to add before the command.
 *
 * @return {import('../lib/config').PHPSnifferConfig}
 *   The config stub.
 */
const getConfigMock = (opts = {}) => ({
  ...{
    filePath: '',
    standard: '',
    prefix: '',
    spawnOptions: {
      cwd: FIXTURES_PATH,
      shell: process.platform === 'win32',
    },
  },
  ...opts,
});

module.exports.getConfigMock = getConfigMock;

/**
 * Creates a token stub.
 *
 * @return {import('vscode').CancellationToken}
 *   A token stub.
 */
const createStubToken = () => ({
  onCancellationRequested() {
    return { dispose() { } };
  },
  isCancellationRequested: false,
});

module.exports.createStubToken = createStubToken;

/**
 * Mock token extra type properties.
 *
 * @typedef MockTokenExtras
 *
 * @prop {() => void} cancel
 *   Cancels the token.
 */

/**
 * Mock token.
 *
 * @typedef {import('vscode').CancellationToken & MockTokenExtras} MockToken
 */

/**
 * Creates a mock token.
 *
 * @return {MockToken}
 *   A mock token that can be cancelled.
 */
const createMockToken = () => {
  /** @type {(...args: any[]) => void} */
  let cancelCallback;

  return {
    isCancellationRequested: false,
    cancel() {
      this.isCancellationRequested = true;
      if (cancelCallback) cancelCallback();
    },
    onCancellationRequested(callback) {
      cancelCallback = callback;
      return { dispose: () => { } };
    },
  };
};

module.exports.createMockToken = createMockToken;

/**
 * Asserts two positions are the same.
 *
 * @param {import('vscode').Position} actual
 *   The actual position.
 * @param {import('vscode').Position} expected
 *   The expected position to receive.
 */
module.exports.assertPosition = (actual, expected) => {
  assert.ok(expected.isEqual(actual), new assert.AssertionError({
    message: `Expected positions to be the same:

Line ${actual.line}, Character ${actual.character} != Line ${expected.line}, Character ${expected.character}
`,
    actual: { line: actual.line, character: actual.character },
    expected: { line: expected.line, character: expected.character },
    operator: 'assertPosition',
  }));
};
