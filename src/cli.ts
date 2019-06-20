/**
 * @file
 * Contains CLI utilities.
 */

import { SpawnOptions, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { CancellationToken } from 'vscode';
import { stringsList } from './strings';

/**
 * Maps CLI argument map into a formatted array of strings.
 *
 * @param args
 *   A map with string keys and values.
 *
 * @return
 *   The argument pairs in --a=b format.
 */
export function mapToCliArgs(args: Map<string, string>, quote: boolean = false): string[] {
  return Array.from(args.entries())
    .filter(([key, value]) => value !== '' && key !== '')
    .map(([key, value]) => {
      const printValue = quote && value.includes(' ') ? `"${value}"` : value;
      return `--${key}=${printValue}`;
    });
}

/**
 * Converts a close event to a promise.
 *
 * @param emitter
 *   The close event emitter to listen for the close event on.
 * @return
 *   A promise that resolves to the first argument of the close event callback.
 */
const closePromise = <T>(emitter: EventEmitter) => new Promise<T>(
  resolve => emitter.on('close', resolve),
);

// Special error class for CLI command non-zero exits.
export class CliCommandError extends Error {
  constructor(public stdout: string, public stderr: string, public exitCode: number) {
    super(stringsList([exitCode.toString(), stdout, stderr]));
  }
}

// Options type for `executeCommand()`.
type ExecuteCommandOptions = {
  command: string;
  token: CancellationToken;
  args?: string[];
  stdin?: string;
  spawnOptions?: SpawnOptions;
}

/**
 * Executes a CLI command.
 *
 * @param command
 *   The executable command.
 * @param token
 *   A token that can be called to cancel the execution.
 * @param args
 *   The list of command arguments.
 * @param stdin
 *   The input to pass to the command as STDIN.
 * @param spawnOptions
 *   Options for `child_process.spawn`.
 * @return
 *   STDOUT output if the command executed successfully, or `null` if it was
 *   cancelled by the token.
 *
 * @throws {CliCommandError}
 *   Throws when the CLI command exits with a non-zero code.
 */
export async function executeCommand({
  command,
  token,
  args = [],
  stdin = '',
  spawnOptions = {},
}: ExecuteCommandOptions) {
  const cliProcess = spawn(command, args, spawnOptions);

  token.onCancellationRequested(() => !cliProcess.killed && cliProcess.kill());

  cliProcess.stdin.write(stdin);
  cliProcess.stdin.end();

  let stdout = '';
  cliProcess.stdout.on('data', data => { stdout += data; });

  let stderr = '';
  cliProcess.stderr.on('data', data => { stderr += data; });

  const exitCode = await closePromise<number>(cliProcess);

  if (token.isCancellationRequested) return null;
  if (exitCode !== 0) throw new CliCommandError(stdout, stderr, exitCode);
  return stdout;
}
