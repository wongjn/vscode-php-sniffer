import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  languages,
  Range,
  TextDocument,
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
    if (!event.affectsConfiguration('phpSniffer')) {
      return;
    }
    
    if (event.affectsConfiguration('phpSniffer.run') || event.affectsConfiguration('phpSniffer.onTypeDelay')) {
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

    const config = workspace.getConfiguration('phpSniffer');
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
    this.diagnosticCollection!.clear();

    workspace.textDocuments.forEach(this.validate, this);
  }

  /**
   * Lints a document.
   * 
   * @param document - The document to lint.
   */
  protected validate(document: TextDocument): void {
    if (document.languageId !== 'php') {
      return;
    }

    const config = workspace.getConfiguration('phpSniffer', document.uri);
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
        report.messages.forEach(({ message, line, column, type, source }) => {
          const zeroLine = line - 1;
          const ZeroColumn = column - 1;

          diagnostics.push(
            new Diagnostic(
              new Range(zeroLine, ZeroColumn, zeroLine, Number.MAX_VALUE),
              `[${source}]\n${message}`,
              type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
            ),
          );
        });
      } catch(error) {
        console.error(stdout);
        console.error(error.toString());
      }

      this.diagnosticCollection.set(document.uri, diagnostics);
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