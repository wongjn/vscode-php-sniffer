/**
 * @file
 * Utilities for tests.
 */

import { exec } from 'child_process';

/**
 * Executes a CLI command with promised result.
 *
 * @param command
 *   The CLI command to run.
 * @return
 *   The Promise that resolves with the stdout of the command.
 */
export function execPromise(command: string): Thenable<string> {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

/**
 * setTimeout as a promise.
 *
 * @param wait
 *   How long to wait in milliseconds.
 * @return
 *   A promise that resolves after specified wait time has passed.
 */
export function waitPromise(wait: number): Thenable<void> {
  return new Promise(resolve => {
    setTimeout(resolve, wait);
  });
}
