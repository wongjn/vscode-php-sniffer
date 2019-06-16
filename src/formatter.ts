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

export type getFormattedTextParams = {
  text: string;
  token: CancellationToken;
  formatOptions: FormattingOptions;
  execFolder?: string;
  standard?: string;
  excludes?: string[];
  cwd?: string | undefined;
  isFullDocument?: boolean;
}

/**
 * Returns formatted text for a snippet via PHPCBF.
 */
export async function getFormattedText({
  text,
  token,
  formatOptions,
  execFolder = '',
  standard = '',
  excludes = [],
  cwd = undefined,
  isFullDocument = true,
}: getFormattedTextParams) {
  const indent: string = isFullDocument
    ? ''
    : getIndentation(text, formatOptions);
  const needsPhpTag: boolean = !text.includes('<?');

  const args = new Map([['standard', standard]]);

  // Only add exclude sniffs if not on a full document. This is to avoid
  // snippets that format the start or the end of the snippet.
  if (excludes.length && !isFullDocument) {
    args.set('exclude', excludes.join(','));
  }

  let inputText: string = text;
  if (!isFullDocument) {
    // Remove snippet-wide indentation before sending to phpcbf.
    if (indent) {
      inputText = inputText.replace(new RegExp(`^${indent}`, 'm'), '');
    }
    // Add <?php tag to the snippet so that phpcbf recognizes it as PHP code.
    if (needsPhpTag) {
      inputText = `<?php\n${inputText}`;
    }
  }

  const spawnOptions = { cwd, shell: process.platform === 'win32' };

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
      let result = error.stdout;

      if (!isFullDocument) {
        // Remove <?php tag if we added it.
        if (needsPhpTag) {
          result = result.replace(/<\?(php)?\n?/, '');
        }
        // Restore snippet indentation.
        if (indent) {
          result = result.replace(/^(.+)/mg, `${indent}$1`);
        }
      }

      return result;
    }

    // Re-throw the error if it was not a 1 exit code.
    throw error;
  }

  // Cancellation or 0 exit returns null to indicate no change.
  return null;
}

/* eslint class-methods-use-this: 0 */
export class Formatter implements DocumentRangeFormattingEditProvider {
  /**
   * {@inheritDoc}
   */
  public async provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    formatOptions: FormattingOptions,
    token: CancellationToken,
  ): Promise<TextEdit[]> {
    const config = workspace.getConfiguration('phpSniffer', document.uri);

    const replacement = await getFormattedText({
      execFolder: config.get('executablesFolder', ''),
      standard: config.get('standard', ''),
      excludes: config.get('snippetExcludeSniffs', []),
      text: document.getText(range),
      cwd: workspace.workspaceFolders && workspace.workspaceFolders[0].uri.scheme === 'file'
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined,
      token,
      formatOptions,
      isFullDocument: isFullDocumentRange(range, document),
    });

    return replacement ? [new TextEdit(range, replacement)] : [];
  }
}
