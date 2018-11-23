import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  languages,
  Range,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { spawn } from 'child_process';
import { PHPCSReport, PHPCSMessageType } from './phpcs-report';

export class Validator {
  private diagnosticCollection?: DiagnosticCollection;

  /**
   * A list of documents being parsed.
   */
  private documentQueue: Set<Uri> = new Set();

  constructor(subscriptions: Disposable[]) {
    workspace.onDidChangeConfiguration(this.refresh, this, subscriptions);
    workspace.onDidOpenTextDocument(this.validate, this, subscriptions);
    workspace.onDidCloseTextDocument(this.clearDocumentDiagnostics, this, subscriptions);
    
    this.diagnosticCollection = languages.createDiagnosticCollection();
    this.refresh();
  }

  /**
   * Dispose this object.
   */
  public dispose(): void {
    if (this.diagnosticCollection) {
      this.diagnosticCollection.clear();
      this.diagnosticCollection.dispose();
    }
  }

  /**
   * Refreshes validation on any open documents.
   */
  protected refresh(): void {
    workspace.textDocuments.forEach(this.validate, this);
  }

  /**
   * Lints a document.
   * 
   * @param document - The document to lint.
   */
  protected validate(document: TextDocument): void {
    if (document.languageId !== 'php' || this.documentQueue.has(document.uri)) {
      return;
    }

    this.documentQueue.add(document.uri);

    const config = workspace.getConfiguration('phpcbf', document.uri);
    const execFolder: string = config.get('executablesFolder', '');
    const standard: string = config.get('standard', '');

    const args = [
      '--report=json',
    ];
    if (standard) {
      args.push(`--standard=${standard}`);
    }

    const spawnOptions = { shell: process.platform === 'win32' };
    const command = spawn(`${execFolder}phpcs`, [...args, '-'], spawnOptions);

    let stdout = '';

    command.stdin.write(document.getText());
    command.stdin.end();

    command.stdout.setEncoding('utf8');
    command.stdout.on('data', data => stdout += data);

    command.on('close', code => {
      const diagnostics: Diagnostic[] = [];

      try {
        const { files: { STDIN: report } }: PHPCSReport = JSON.parse(stdout);
        report.messages.forEach(({ message, line, column, type }) => {
          const zeroLine = line - 1;
          const ZeroColumn = column - 1;

          diagnostics.push(
            new Diagnostic(
              new Range(zeroLine, ZeroColumn, zeroLine, Number.MAX_VALUE),
              message,
              type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
            ),
          );
        });
      } catch(error) {
        console.error(error.toString());
      }

      this.diagnosticCollection!.set(document.uri, diagnostics);
      this.documentQueue.delete(document.uri);
    });
  }

  /**
   * Clears diagnostics from a document.
   * 
   * @param document - The document to clear diagnostics of.
   */
  protected clearDocumentDiagnostics({ uri }: TextDocument): void {
    this.diagnosticCollection!.delete(uri);
  }

}