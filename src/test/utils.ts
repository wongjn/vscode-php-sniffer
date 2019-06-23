import { ExecOptions, exec } from 'child_process';
import * as path from 'path';
import { WorkspaceConfigurationReadable } from '../config';

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

type ConfigValues = {
  [key: string]: any
}

export class ConfigMock implements WorkspaceConfigurationReadable {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(protected data: ConfigValues = {}) { }

  get<T>(key: string, defaultValue: T): T {
    return key in this.data ? this.data[key] : defaultValue;
  }
}
