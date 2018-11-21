import { ExtensionContext, languages } from 'vscode';
import { Formatter } from './formatter';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider(
      { language: 'php', scheme: 'file' },
      new Formatter(),
    )
  );
}
