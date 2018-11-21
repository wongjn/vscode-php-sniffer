import {
  DocumentFormattingEditProvider,
  CancellationToken,
  FormattingOptions,
  Position,
  TextDocument,
  TextEdit,
  workspace,
  Range,
} from 'vscode';
import { spawn } from 'child_process';

export class Formatter implements DocumentFormattingEditProvider {

  public async provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[]> {
    const time = Date.now();
    const config = workspace.getConfiguration('phpcbf');

    const args = [`--standard=${config.get('standard', '')}`, '-'];
    const spawnOptions = { shell: process.platform === 'win32' };
    const command = spawn('phpcbf', args, spawnOptions);

    let stdout = '';
    let stderr = '';

    token.onCancellationRequested(() => !command.killed && command.kill());

    command.stdin.write(document.getText());
    command.stdin.end();

    command.stdout.setEncoding('utf8');
    command.stdout.on('data', data => stdout += data);
    command.stderr.on('data', data => stderr += data);

    return new Promise<TextEdit[]>((resolve, reject) => {
      command.on('close', code => {
        if (token.isCancellationRequested) {
          const message = 'Formatting cancelled.';
          console.warn(message);
          return reject(message);
        }

        if (code !== 1) {
          return reject(stderr);
        }

        const fileStart = new Position(0, 0);
        const fileEnd = document.lineAt(document.lineCount - 1).range.end;
        const textEdit = new TextEdit(new Range(fileStart, fileEnd), stdout);

        console.log(`Took ${Date.now() - time}ms to run.`);
        
        return resolve([textEdit]);
      });
    });
  }

}