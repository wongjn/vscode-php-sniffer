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
import { mapToCliArgs, executeCommand, CliCommandError } from './cli';
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

    try {
      // PHPCBF uses unconventional exit codes, see
      // https://github.com/squizlabs/PHP_CodeSniffer/issues/1270#issuecomment-272768413
      await executeCommand({
        command: `${execFolder}phpcbf`,
        token,
        args: [...mapToCliArgs(args, spawnOptions.shell), '-'],
        stdin: inputText,
        spawnOptions,
      });
    } catch (error) {
      // Exit code 1 indicates all fixable errors were fixed correctly.
      if (error instanceof CliCommandError && error.exitCode === 1) {
        // Add indentation back in if it was not a full document format.
        const replacement = isFullDocument
          ? error.stdout
          : error.stdout.replace(new RegExp('^(.+)', 'm'), `${indent}$1`);

        return [new TextEdit(range, replacement)];
      }

      console.error(error);
    }

    return [];
  }
}
