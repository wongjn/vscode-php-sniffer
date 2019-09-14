/**
 * @file
 * Shape description for PHPCS JSON report.
 */

import { Diagnostic, DiagnosticSeverity, Range } from 'vscode';

/**
 * Types of PHPCS feedback messages.
 */
export const enum PHPCSMessageType {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

// Information about a violation.
type PHPCSMessage = {
  message: string;
  source: string;
  severity: number;
  fixable: boolean;
  type: PHPCSMessageType;
  line: number;
  column: number;
}

// PHPCS JSON report shape.
export type PHPCSReport = {
  totals: {
    errors: number;
    warnings: number;
    fixable: number;
  };
  files: {
    [key: string]: {
      errors: number;
      warnings: number;
      messages: PHPCSMessage[];
    };
  };
}

/**
 * Parses a PHPCS JSON report to a set of diagnostics.
 *
 * @param report
 *   The PHPCS report in JSON format.
 * @return
 *   The list of diagnostics.
 */
export const reportFlatten = ({ files }: PHPCSReport): Diagnostic[] => Object.values(files)
  .reduce<PHPCSMessage[]>((stack, { messages }) => [...stack, ...messages], [])
  .map(({
    message, line, column, type, source,
  }) => new Diagnostic(
    new Range(line - 1, column - 1, line - 1, column - 1),
    `[${source}]\n${message}`,
    type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  ));
