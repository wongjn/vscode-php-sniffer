import { ExtensionContext, languages } from 'vscode';
import { Formatter } from './formatter';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerDocumentRangeFormattingEditProvider(
      { language: 'php', scheme: 'file' },
      new Formatter(),
    )
  );
}
