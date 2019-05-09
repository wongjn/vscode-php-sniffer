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
import { CliArguments } from './cli-arguments';

interface TextProcessState {
  text: string;
  postProcessor: (rawResult: string) => string;
}

interface Indentation {
  replace: RegExp;
  indent: string;
}

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
    const config = workspace.getConfiguration('phpSniffer', document.uri);
    const execFolder: string = config.get('executablesFolder', '');
    const standard: string = config.get('standard', '');
    const excludes: Array<string> = config.get('snippetExcludeSniffs', []);
    const isFullDocument = Formatter.isFullDocumentRange(range, document);

    const args = new CliArguments();
    args.set('standard', standard);

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
      [...args.getAll(spawnOptions.shell), '-'],
      spawnOptions,
    );

    try {
      let stdout = '';

      token.onCancellationRequested(() => !command.killed && command.kill());

      const { text, postProcessor } = Formatter.prepareText(document, range, options);
      command.stdin.write(text);
      command.stdin.end();

      command.stdout.setEncoding('utf8');
      command.stdout.on('data', data => stdout += data);

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

          const replacement = postProcessor(stdout);
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

  /**
   * Prepares text for `phpcbf` to run on.
   *
   * @param document
   *   The document the formatting is running on.
   * @param range
   *   The range that formatting should be acting upon.
   * @param formatOptions
   *   The options that the document is formatted by.
   * @return
   *   A state object that includes the text. The postProcessor member
   *   should be run on the formatted text to reverse changes made here.
   *
   * @todo PHP tag and indentation processes here could be extracted to a common
   *   (functional?) interface of some sort, i.e. a micro-plugin system.
   */
  protected static prepareText(document: TextDocument, range: Range, formatOptions: FormattingOptions): TextProcessState {
    let text = document.getText(range);

    const isFullDocument = this.isFullDocumentRange(range, document);
    const needsPhpTag = !isFullDocument && !text.includes('<?');
    const eol: string = document.eol === EndOfLine.LF ? '\n' : '\r\n';
    const lines = text.split(eol);

    const indentation = isFullDocument ? null : this.getIndentation(lines, formatOptions);
    if (indentation) {
      // Temporarily remove indentation.
      text = lines.map(line => line.replace(indentation.replace, '')).join(eol);
    }

    return {
      text: `${needsPhpTag ? `<?php${eol}` : ''}${text}`,
      postProcessor: (rawResult: string): string => {
        let result = rawResult;

        if (needsPhpTag) {
          result = result.replace(`<?php${eol}`, '');
        }

        // Restore removed indentation.
        if (indentation) {
          result = result
            .split(eol)
            .map(line => `${line.length > 0 ? indentation.indent : ''}${line}`)
            .join(eol);
        }

        return result;
      },
    };
  }

  /**
   * Gets indentation information for a document.
   *
   * @param lines
   *   The text as an array of strings per line.
   * @param param1
   *   Indentation options for the document.
   */
  protected static getIndentation(lines: string[], { insertSpaces, tabSize }: FormattingOptions): Indentation | null {
    const unit = insertSpaces ? ' '.repeat(tabSize) : '\t';
    const indentMatcher = new RegExp(`^((?:${unit})*).+`);
    const unitCounter = new RegExp(unit, 'g');

    const count = lines.reduce((tally, line) => {
      if (tally === 0) return tally;

      const match = indentMatcher.exec(line);
      if (!(match instanceof Array)) {
        return tally;
      }
      const [, lineIndent] = match;

      // Minimum reached, do nothing more.
      if (lineIndent === '') {
        return 0;
      }

      return Math.min(lineIndent.match(unitCounter)!.length, tally);
    }, Number.MAX_SAFE_INTEGER);

    // No indentation found.
    if (count === 0) {
      return null;
    }

    return {
      replace: new RegExp(`^(${unit}){0,${count}}`),
      indent: unit.repeat(count),
    };
  }

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
  public static isFullDocumentRange(range: Range, document: TextDocument): boolean {
    const documentRange = new Range(
      new Position(0, 0),
      document.lineAt(document.lineCount - 1).range.end,
    );

    return range.isEqual(documentRange);
  }
}
