import {
  DocumentRangeFormattingEditProvider,
  CancellationToken,
  EndOfLine,
  FormattingOptions,
  Position,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'vscode';
import { spawn } from 'child_process';

interface TextProcessState {
  text: string;
  eol: string;
  needsPhpTag: boolean;
}

export class Formatter implements DocumentRangeFormattingEditProvider {

  /**
   * {@inheritDoc}
   */
  public async provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[]> {
    const time = Date.now();

    const isFullDocument = Formatter.isFullDocumentRange(range, document);

    const config = workspace.getConfiguration('phpcbf', document.uri);
    const executable: string = config.get('executable', 'phpcbf');
    const standard: string = config.get('standard', '');
    const excludes: Array<string> = config.get('snippetExcludeSniffs', []);

    const args = [];
    if (standard) {
      args.push(`--standard=${standard}`);
    }
    if (excludes.length && !isFullDocument) {
      args.push(`--exclude=${excludes.join(',')}`);
    }

    const spawnOptions = { shell: process.platform === 'win32' };
    const command = spawn(executable, [...args, '-'], spawnOptions);

    let stdout = '';

    token.onCancellationRequested(() => !command.killed && command.kill());

    const processedState = Formatter.prepareText(document, range);
    command.stdin.write(processedState.text);
    command.stdin.end();

    command.stdout.setEncoding('utf8');
    command.stdout.on('data', data => stdout += data);

    return new Promise<TextEdit[]>((resolve, reject) => {
      command.on('close', code => {
        if (token.isCancellationRequested) {
          const message = 'Formatting cancelled.';
          console.warn(message);
          return reject(message);
        }

        if (code !== 1) {
          console.error(stdout);
          return reject(stdout);
        }

        const replacement = Formatter.postProcessText(stdout, processedState);

        console.log(`Took ${Date.now() - time}ms to run.`);
        return resolve([new TextEdit(range, replacement)]);
      });
    });
  }

  /**
   * Prepares text for `phpcbf` to run on.
   * 
   * @param document - The document the formatting is running on.
   * @param range    - The range that formatting should be acting upon.
   * @returns A state object that includes the text. This should be passed to
   *   `postProcessText()` for reverting some of the needed changes made here.
   */
  protected static prepareText(document: TextDocument, range: Range): TextProcessState {
    const text = document.getText(range);

    const isFullDocument = this.isFullDocumentRange(range, document);
    const needsPhpTag = !isFullDocument && !text.includes('<?');
    const eol: string = document.eol === EndOfLine.LF ? '\n' : '\r\n';

    return {
      text: `${needsPhpTag ? `<?php${eol}` : ''}${text}`,
      eol,
      needsPhpTag,
    };
  }

  /**
   * Post-process the result from `phpcbf`.
   * 
   * Reverts changes made by `prepareText()`.
   * 
   * @param rawResult    - The resulting text from `phpcbf`.
   * @param processState - The process state from `prepareText()`.
   * @returns The actual formatted version of text.
   */
  protected static postProcessText(rawResult: string, { needsPhpTag, eol }: TextProcessState): string {
    if (!needsPhpTag) {
      return rawResult;
    }

    return rawResult.replace(`<?php${eol}`, '');
  }

  /**
   * Tests whether a range is for the full document.
   * 
   * @param range    - The range to test.
   * @param document - The document to test with.
   * @returns `true` if the given `range` is the full `document`.
   */
  public static isFullDocumentRange(range: Range, document: TextDocument): boolean {
    const documentRange = new Range(
      new Position(0, 0),
      document.lineAt(document.lineCount - 1).range.end,
    );

    return range.isEqual(documentRange);
  }

}