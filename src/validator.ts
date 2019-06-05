/**
 * @file
 * Contains the validator class.
 */

import {
  CancellationTokenSource,
  ConfigurationChangeEvent,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  languages,
  Range,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
  window,
  workspace,
} from 'vscode';
import { exec, ChildProcess, spawn } from 'child_process';
import { debounce } from 'lodash';
import { reportFlatten, PHPCSReport } from './phpcs-report';
import { mapToCliArgs } from './cli';
import { stringsList } from './strings';

const enum runConfig {
  save = 'onSave',
  type = 'onType',
}

/**
 * Kills PHP CLIs.
 *
 * This is needed for Windows since ChildProcess.kill() only kills the spawner
 * cmd.exe, even with `taskkill /T /F /pid ${pid}` where /T is supposed to kill
 * trees from the spawner but it seems the php process is launched in a
 * disconnected way.
 *
 * @param command
 *   The process to kill.
 */
function phpCliKill(command: ChildProcess, processName: string) {
  if (process.platform === 'win32' && workspace.getConfiguration('phpSniffer').get('windowsHardkill')) {
    // Whole code block below could be more succinctly done with:
    // `taskkill /v /fi "cputime gt 00:00:02" /fi "cputime lt 00:00:10" /im ${processName}`
    // but `cputime gt` filter does not seem to work in this case.
    exec(
      `tasklist /v /fi "cputime ge 00:00:02" /fi "cputime lt 00:00:10" /fi "imagename eq ${processName}" /fo csv`,
      (err, stdout) => {
        if (err) window.showErrorMessage('PHPCS: Error trying to kill PHP CLI, you may need to kill the process yourself.');
        if (stdout.includes('","')) {
          const pids = stdout.split('\n').slice(1).map(row => {
            const [, pid] = row.substr(1, row.length - 2).split('","');
            return pid;
          });

          exec(`taskkill /F ${pids.map(pid => `/pid ${pid}`).join(' ')}`);
        }
      },
    );
  }

  command.kill();
}

/**
 * Parses PHPCS report to VSCode diagnostics list.
 *
 * @param report
 *   The JSON object report from the CLI.
 * @return
 *   The diagnostics.
 */
const parseReport = (report: PHPCSReport): Diagnostic[] => reportFlatten(report)
  .map(({
    line, column, message, error,
  }) => new Diagnostic(
    new Range(line, column, line, column),
    message,
    error ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  ));

export class Validator {
  private diagnosticCollection: DiagnosticCollection = languages.createDiagnosticCollection('php');

  /**
   * The active validator listener.
   */
  private validatorListener?: Disposable;

  /**
   * Token to cancel a current validation runs.
   */
  private runnerCancellations: Map<Uri, CancellationTokenSource> = new Map();

  constructor(subscriptions: Disposable[]) {
    workspace.onDidChangeConfiguration(this.onConfigChange, this, subscriptions);
    workspace.onDidOpenTextDocument(this.validate, this, subscriptions);
    workspace.onDidCloseTextDocument(this.clearDocumentDiagnostics, this, subscriptions);
    workspace.onDidChangeWorkspaceFolders(this.refresh, this, subscriptions);

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
   * @param event
   *   The configuration change event.
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
      const validator = debounce(
        ({ document }: TextDocumentChangeEvent): void => { this.validate(document); },
        delay,
      );
      this.validatorListener = workspace.onDidChangeTextDocument(validator);
    } else {
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
   * @param document
   *   The document to lint.
   */
  protected validate(document: TextDocument): void {
    if (document.languageId !== 'php') {
      return;
    }

    const oldRunner = this.runnerCancellations.get(document.uri);
    if (oldRunner) {
      oldRunner.cancel();
      oldRunner.dispose();
    }

    const runner = new CancellationTokenSource();
    this.runnerCancellations.set(document.uri, runner);
    const { token } = runner;

    const config = workspace.getConfiguration('phpSniffer', document.uri);
    const execFolder: string = config.get('executablesFolder', '');
    const standard: string = config.get('standard', '');
    const windowsKillTarget: string = config.get('windowsPhpCli', 'php.exe');

    const args = new Map([
      ['report', 'json'],
      ['standard', standard],
    ]);

    if (document.uri.scheme === 'file') {
      args.set('stdin-path', document.uri.fsPath);
    }

    const spawnOptions = {
      cwd: workspace.workspaceFolders && workspace.workspaceFolders[0].uri.scheme === 'file'
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined,
      shell: process.platform === 'win32',
    };

    const command = spawn(
      `${execFolder}phpcs`,
      [
        ...mapToCliArgs(args, spawnOptions.shell),
        // Exit with 0 code even if there are sniff warnings or errors so we can
        // use error callback for actual execution errors.
        '--runtime-set', 'ignore_warnings_on_exit', '1',
        '--runtime-set', 'ignore_errors_on_exit', '1',
        // Ensure quiet output to override any output settings from config.
        // Ensures we get JSON only.
        '-q',
        // Read stdin.
        '-',
      ],
      spawnOptions,
    );

    token.onCancellationRequested(() => !command.killed && phpCliKill(command, windowsKillTarget));

    let stdout = '';
    let stderr = '';

    command.stdin.write(document.getText());
    command.stdin.end();

    command.stdout.setEncoding('utf8');
    command.stdout.on('data', data => { stdout += data; });
    command.stderr.on('data', data => { stderr += data; });

    const done = new Promise((resolve, reject) => {
      // Shows errors in UI and rejects the promise.
      const showError = (messages: string[]) => {
        const errorMessage = stringsList(messages);
        window.showErrorMessage(errorMessage);
        reject(new Error(errorMessage));
      };

      command.on('close', exitCode => {
        runner.dispose();
        this.runnerCancellations.delete(document.uri);

        if (token.isCancellationRequested) {
          resolve();
          return;
        }

        if (exitCode > 0 || stderr) {
          showError([stdout, stderr]);
          return;
        }

        try {
          this.diagnosticCollection.set(
            document.uri,
            parseReport(JSON.parse(stdout)),
          );
          resolve();
        } catch (error) {
          showError([stdout, stderr, error.toString()]);
        }
      });
    });

    setTimeout(() => {
      if (!command.killed) {
        phpCliKill(command, windowsKillTarget);
      }
    }, 3000);

    window.setStatusBarMessage('PHP Sniffer: validating…', done);
  }

  /**
   * Clears diagnostics from a document.
   *
   * @param document
   *   The document to clear diagnostics of.
   */
  protected clearDocumentDiagnostics({ uri }: TextDocument): void {
    this.diagnosticCollection.delete(uri);
  }
}
