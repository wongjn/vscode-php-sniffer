/**
 * @file
 * Contains the Formatter class.
 */

import {
  CancellationToken,
  FormattingOptions,
  Position,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'vscode';
import { mapToCliArgs, executeCommand, CliCommandError } from './cli';
import { processSnippet } from './strings';
import { getResourceConfig, PHPSnifferConfigInterface } from './config';

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

/**
 * Returns a formatting intermediary function.
 *
 * @param token
 *   A token that can be called to cancel the formatting.
 * @param config
 *   The normalized configuration of the extension.
 * @param excludes
 *   An optional list of sniffs to exclude.
 * @return
 *   Another factory function that accepts any standards to exclude to create
 *   the final formatter function to format text via PHPCBF.
 */
export function formatterFactory(
  token: CancellationToken,
  { standard, prefix, spawnOptions }: PHPSnifferConfigInterface,
  excludes: string[] = [],
) {
  return async (text: string) => {
    const args = new Map([['standard', standard]]);

    if (excludes.length) {
      args.set('exclude', excludes.join(','));
    }

    try {
      // PHPCBF uses unconventional exit codes, see
      // https://github.com/squizlabs/PHP_CodeSniffer/issues/1270#issuecomment-272768413
      await executeCommand({
        command: `${prefix}phpcbf`,
        token,
        args: [...mapToCliArgs(args, spawnOptions.shell as boolean), '-'],
        stdin: text,
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

    return '';
  };
}

export const Formatter = {
  /**
   * {@inheritDoc}
   */
  async provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    formatOptions: FormattingOptions,
    token: CancellationToken,
  ): Promise<TextEdit[]> {
    const isFullDocument = isFullDocumentRange(range, document);
    const config = workspace.getConfiguration('phpSniffer', document.uri);
    const text = document.getText(range);

    const formatter = formatterFactory(
      token,
      getResourceConfig(document.uri),
      isFullDocument ? [] : config.get('snippetExcludeSniffs', []),
    );

    const replacement: string = isFullDocument
      ? await processSnippet(text, formatOptions, formatter)
      : await formatter(text);

    return replacement ? [new TextEdit(range, replacement)] : [];
  },
};
