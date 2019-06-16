import { ExecOptions, exec } from 'child_process';
import * as path from 'path';

/**
 * Executes a CLI command with promised result.
 *
 * @param command
 *   The CLI command to run.
 * @return
 *   The Promise that resolves with the stdout of the command.
 */
export function execPromise(command: string, options: ExecOptions = {}): Thenable<string> {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

// Fixtures directory.
export const FIXTURES_PATH = path.resolve(__dirname, '../../src/test/fixtures');
