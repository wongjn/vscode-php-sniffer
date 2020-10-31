/**
 * @file
 * Contains CLI utilities.
 */

const { spawn } = require('child_process');
const { stringsList } = require('./strings');

/**
 * Quotes a string if it contains spaces and not already double-quote quoted.
 *
 * @param {string} string
 *   The string to possibly quote.
 *
 * @return {string}
 *   Result string.
 */
const quoteSpaces = (string) => (string.includes(' ') && !string.includes('"') ? `"${string}"` : string);

/**
 * Maps CLI argument map into a formatted array of strings.
 *
 * @param {Map<string, string>} args
 *   A map with string keys and values.
 * @param {boolean} [quote=false]
 *   Whether the arguments need to be quoted.
 *
 * @return {string[]}
 *   The argument pairs in --a=b format.
 */
module.exports.mapToCliArgs = (args, quote = false) => Array.from(args.entries())
  .filter(([key, value]) => value !== '' && key !== '')
  .map(([key, value]) => `--${key}=${(quote && quoteSpaces(value)) || value}`);

/**
 * Converts a close event to a promise.
 *
 * @param {import('events').EventEmitter} emitter
 *   The close event emitter to listen for the close event on.
 *
 * @return {Promise<any>}
 *   A promise that resolves to the first argument of the close event callback.
 */
const closePromise = (emitter) => new Promise((resolve, reject) => {
  emitter.on('close', resolve);
  emitter.on('error', reject);
});

/**
 * Special error class for CLI command non-zero exits.
 */
class CliCommandError extends Error {
  /**
   * Constructs a CliCommandError.
   *
   * @param {string} stdout
   *   The standard output from the CLI.
   * @param {string} stderr
   *   The standard error from the CLI command.
   * @param {number} exitCode
   *   The code the CLI command exited with.
   */
  constructor(stdout, stderr, exitCode) {
    super(stringsList([stdout, stderr]));

    /**
     * The standard output from the CLI command.
     *
     * @type {string}
     */
    this.stdout = stdout;

    /**
     * The standard error from the CLI command.
     *
     * @type {string}
     */
    this.stderr = stderr;

    /**
     * The code the CLI command exited with.
     *
     * @type {number}
     */
    this.exitCode = exitCode;
  }
}

module.exports.CliCommandError = CliCommandError;

/**
 * Options type for `executeCommand()`.
 *
 * @typedef ExecuteCommandOptions
 *
 * @prop {string} command
 *   The binary command to execute.
 * @prop {import('vscode').CancellationToken} token
 *   The token to use to signify possible cancellation.
 * @prop {string[]} [args]
 *   Arguments to pass to the command.
 * @prop {string} [stdin]
 *   Data to pass to stdin.
 * @prop {import('child_process').SpawnOptions} [spawnOptions]
 *   Options to pass to `child_process.spawn()`.
 */

/**
 * Executes a CLI command.
 *
 * @param {ExecuteCommandOptions} options
 *   Options to execute a command with.
 *
 * @return {Promise<string|null>}
 *   STDOUT output if the command executed successfully, or `null` if it was
 *   cancelled by the token.
 *
 * @throws {CliCommandError}
 *   Throws when the CLI command exits with a non-zero code.
 */
async function executeCommand(options) {
  const { command, token, stdin = '', spawnOptions = {} } = options;
  const cliProcess = spawn(
    // Fix spaces in command in Windows shell (nodejs/node#7367).
    (spawnOptions.shell && quoteSpaces(command)) || command,
    options.args || [],
    spawnOptions,
  );

  token.onCancellationRequested(() => !cliProcess.killed && cliProcess.kill());

  // Check successfully spawned process before writing as work-around for
  // https://github.com/electron/electron/issues/13254.
  // Fix inspired from
  // https://github.com/microsoft/vscode/issues/56387#issuecomment-413521483.
  if (cliProcess.pid) {
    cliProcess.stdin.write(stdin);
    cliProcess.stdin.end();
  }

  let stdout = '';
  cliProcess.stdout.on('data', (data) => { stdout += data; });

  let stderr = '';
  cliProcess.stderr.on('data', (data) => { stderr += data; });

  /** @type {number} */
  const exitCode = await closePromise(cliProcess);

  if (token.isCancellationRequested) return null;
  if (exitCode !== 0) throw new CliCommandError(stdout, stderr, exitCode);
  return stdout;
}

module.exports.executeCommand = executeCommand;
