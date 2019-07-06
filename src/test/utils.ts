import { ExecOptions, exec } from 'child_process';
import * as path from 'path';
import { PHPSnifferConfigInterface } from '../config';

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

// Tests source directory.
export const TESTS_PATH = path.resolve(__dirname, '../../src/test');

// Fixtures directory.
export const FIXTURES_PATH = path.join(TESTS_PATH, '/fixtures');

/**
 * All config properties as optional.
 */
interface PHPSnifferOptionalConfigInterface {
  /**
   * Path to the file being checked/formatted.
   */
  filePath?: string;

  /**
   * The `standard` argument to pass to the binary.
   */
  standard?: string;

  /**
   * The prefix string to add before the command.
   */
  prefix?: string;
}

/**
 * Returns a sample config for tests.
 */
export const getConfigMock = (
  opts: PHPSnifferOptionalConfigInterface,
): PHPSnifferConfigInterface => ({
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

interface TestStubDisposable {
  dispose: () => any;
}

export const createStubToken = () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancellationRequested(): TestStubDisposable {
    return { dispose() { } };
  },
  isCancellationRequested: false,
});

export const createMockToken = () => {
  let cancelCallback: (...args: any[]) => void;

  return {
    isCancellationRequested: false,
    cancel() {
      this.isCancellationRequested = true;
      if (cancelCallback) cancelCallback();
    },
    onCancellationRequested(callback: (...args: any[]) => void): TestStubDisposable {
      cancelCallback = callback;

      return {
        dispose: () => { },
      };
    },
  };
};
