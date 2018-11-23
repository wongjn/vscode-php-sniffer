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
  ConfigurationChangeEvent,
  TextDocumentChangeEvent,
} from 'vscode';
import { spawn } from 'child_process';
import { PHPCSReport, PHPCSMessageType } from './phpcs-report';
import { debounce } from 'lodash';

const enum runConfig {
  save = 'onSave',
  type = 'onType',
}

export class Validator {
  private diagnosticCollection: DiagnosticCollection = languages.createDiagnosticCollection();

  /**
   * A list of documents being parsed.
   */
  private documentQueue: Set<Uri> = new Set();

  /**
   * The active validator listener.
   */
  private validatorListener: Disposable | null = null;

  constructor(subscriptions: Disposable[]) {
    workspace.onDidChangeConfiguration(this.onConfigChange, this, subscriptions);
    workspace.onDidOpenTextDocument(this.validate, this, subscriptions);
    workspace.onDidCloseTextDocument(this.clearDocumentDiagnostics, this, subscriptions);
    
    this.refresh();
    this.setValidatorListener();
  }

  /**
   * Dispose this object.
   */
  public dispose(): void {
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
  }

  /**
   * Reacts on configuration change.
   * 
   * @param event - The configuration change event.
   */
  protected onConfigChange(event: ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('phpcbf.run')) {
      this.setValidatorListener();
    }

    this.refresh();
  }

  /**
   * Sets the validation event listening.
   */
  protected setValidatorListener(): void {
    if (this.validatorListener) {
      this.validatorListener.dispose();
    }

    const config = workspace.getConfiguration('phpcbf');
    const run: runConfig = config.get('run', runConfig.save);
    const delay: number = config.get('onTypeDelay', 250);

    if (run === runConfig.type as string) {
      const debounced = debounce(
        ({ document }: TextDocumentChangeEvent): void => { this.validate(document); },
        delay,
      );
      this.validatorListener = workspace.onDidChangeTextDocument(debounced);
    }
    else {
      this.validatorListener = workspace.onDidSaveTextDocument(this.validate, this);
    }
  }

  /**
   * Refreshes validation on any open documents.
   */
  protected refresh(): void {
    this.documentQueue.clear();
    this.diagnosticCollection!.clear();

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
      `--standard=${standard}`,
      '-'
    ];

    const spawnOptions = { shell: process.platform === 'win32' };
    const command = spawn(`${execFolder}phpcs`, args, spawnOptions);

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

      this.diagnosticCollection.set(document.uri, diagnostics);
      this.documentQueue.delete(document.uri);
    });
  }

  /**
   * Clears diagnostics from a document.
   * 
   * @param document - The document to clear diagnostics of.
   */
  protected clearDocumentDiagnostics({ uri }: TextDocument): void {
    this.diagnosticCollection.delete(uri);
  }

}