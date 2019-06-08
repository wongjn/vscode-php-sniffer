/**
 * @file
 * Contains the Formatter class.
 */

import {
  DocumentRangeFormattingEditProvider,
  CancellationToken,
  FormattingOptions,
  Position,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'vscode';
import { spawn } from 'child_process';
import { mapToCliArgs } from './cli';
import { getIndentation } from './strings';

/**
 * Tests whether a range is for the full document.
 *
 * @param range
 *   The range to test.
 * @param document
 *   The document to test with.
 * @return
 *   `true` if the given `range` is the full `document`.
 */
function isFullDocumentRange(range: Range, document: TextDocument): boolean {
  const documentRange = new Range(
    new Position(0, 0),
    document.lineAt(document.lineCount - 1).range.end,
  );

  return range.isEqual(documentRange);
}

/* eslint class-methods-use-this: 0 */
export class Formatter implements DocumentRangeFormattingEditProvider {
  /**
   * {@inheritDoc}
   */
  public async provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    options: FormattingOptions,
    token: CancellationToken,
  ): Promise<TextEdit[]> {
    const isFullDocument = isFullDocumentRange(range, document);
    const documentText = document.getText(range);
    const indent: string = isFullDocument ? '' : getIndentation(documentText, options);

    // The input text to pass to PHPCBF.
    const inputText: string = isFullDocumentRange
      // Use the text as-is.
      ? documentText
      // Normalize the snippet by reducing indentation. The indentation is
      // restored on top of the PHPCBF result.
      : documentText.replace(new RegExp(`^${indent}`, 'm'), '');

    const config = workspace.getConfiguration('phpSniffer', document.uri);
    const execFolder: string = config.get('executablesFolder', '');
    const standard: string = config.get('standard', '');
    const excludes: Array<string> = config.get('snippetExcludeSniffs', []);

    const args = new Map([['standard', standard]]);

    if (excludes.length && !isFullDocument) {
      args.set('exclude', excludes.join(','));
    }

    const spawnOptions = {
      cwd: workspace.workspaceFolders && workspace.workspaceFolders[0].uri.scheme === 'file'
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined,
      shell: process.platform === 'win32',
    };

    const command = spawn(
      `${execFolder}phpcbf`,
      [...mapToCliArgs(args, spawnOptions.shell), '-'],
      spawnOptions,
    );

    try {
      let stdout = '';

      token.onCancellationRequested(() => !command.killed && command.kill());
      command.stdin.write(inputText);
      command.stdout.setEncoding('utf8');
      command.stdout.on('data', data => { stdout += data; });

      return new Promise<TextEdit[]>((resolve, reject) => {
        command.on('close', code => {
          if (token.isCancellationRequested) {
            return resolve();
          }

          if (code !== 1) {
            const message = `PHPCBF: ${stdout}`;
            console.error(message);
            return reject(message);
          }

          const replacement = isFullDocument
            ? stdout
            : stdout.replace(new RegExp('^(.+)', 'm'), `${indent}$1`);
          return resolve([new TextEdit(range, replacement)]);
        });
      });
    } catch (error) {
      if (!command.killed) {
        command.kill();
      }

      throw error;
    }
  }
}
