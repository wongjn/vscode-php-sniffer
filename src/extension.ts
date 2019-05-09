/**
 * @file
 * Extension entry.
 */

import { ExtensionContext, languages } from 'vscode';
import { Formatter } from './formatter';
import { Validator } from './validator';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerDocumentRangeFormattingEditProvider(
      { language: 'php', scheme: 'file' },
      new Formatter(),
    ),
  );

  context.subscriptions.push(new Validator(context.subscriptions));
}
