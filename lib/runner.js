/**
 * @file
 * Running of the PHPCS/PHPCBF executables.
 */

const { mapToCliArgs, executeCommand, CliCommandError } = require('./cli');

/**
 * PHPCBF run.
 *
 * @callback phpcbfRun
 *
 * @param {string} stdin
 *   Input to pass to command as STDIN.
 *
 * @return {Promise<string>}
 *   Formatting result.
 */

/**
 * PHPCS run.
 *
 * @callback phpcsRun
 *
 * @param {string} stdin
 *   Input to pass to command as STDIN.
 *
 * @return {Promise<import('./phpcs-report').PHPCSReport|null>}
 *   The report from PHPCS or `null` if cancelled.
 */

/**
 * Runner object.
 *
 * @typedef {object} Runner
 *
 * @property {phpcbfRun} phpcbf
 *   Runs PHPCBF.
 * @property {phpcsRun} phpcs
 *   Runs PHPCS.
 */

/**
 * Creates a runner for an excutable.
 *
 * @param {typeof import('vscode').workspace} workspace
 *   The VSCode workspace.
 * @param {import('vscode').CancellationToken} token
 *   Cancellation token.
 * @param {import('vscode').Uri} uri
 *   The document URI to create a runner from.
 * @param {boolean} [fullDocument=true]
 *   Whether the document to be processed is for a full document.
 *
 * @return {Runner}
 *   The runner object.
 */
const createRunner = (workspace, token, uri, fullDocument = true) => {
  const VSConfig = workspace.getConfiguration('phpSniffer', uri);

  const standard = VSConfig.get('standard');
  const runFolder = VSConfig.get('executablesFolder', '');

  const directory = workspace.getWorkspaceFolder(uri);
  const spawnOptions = {
    cwd: directory ? directory.uri.fsPath : undefined,
    shell: process.platform === 'win32',
  };

  const args = new Map([['report', 'json']]);
  if (uri.scheme === 'file') args.set('stdin-path', uri.fsPath);
  if (standard) args.set('standard', standard);

  /** @type string[] */
  const excludes = fullDocument ? [] : VSConfig.get('snippetExcludeSniffs', []);

  return {
    async phpcbf(stdin) {
      if (excludes.length) {
        args.set('exclude', excludes.join(','));
      }

      try {
        // PHPCBF uses unconventional exit codes, see
        // https://github.com/squizlabs/PHP_CodeSniffer/issues/1270#issuecomment-272768413
        await executeCommand({
          command: `${runFolder}phpcbf`,
          token,
          args: [...mapToCliArgs(args, !!spawnOptions.shell), '-'],
          stdin,
          spawnOptions,
        });
      } catch (error) {
        // Exit code 1 indicates all fixable errors were fixed correctly.
        if (error instanceof CliCommandError && error.exitCode === 1) {
          return error.stdout;
        }

        // Re-throw the error if it was not a 1 exit code.
        throw error;
      }

      return stdin;
    },
    async phpcs(stdin) {
      const result = await executeCommand({
        command: `${runFolder}phpcs`,
        token,
        stdin,
        args: [
          ...mapToCliArgs(args, !!spawnOptions.shell),
          // Exit with 0 code even if there are sniff warnings or errors so we can
          // use error callback for actual execution errors.
          '--runtime-set', 'ignore_warnings_on_exit', '1',
          '--runtime-set', 'ignore_errors_on_exit', '1',
          // Ensure quiet output to override any output settings from config.
          // Ensures we get JSON only.
          '-q',
          // Read stdin.
          '-',
        ],
        spawnOptions,
      });

      return result ? JSON.parse(result) : null;
    },
  };
};
module.exports.createRunner = createRunner;
