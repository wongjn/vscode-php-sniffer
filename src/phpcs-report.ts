/**
 * @file
 * Shape description for PHPCS JSON report.
 */

/**
 * Types of PHPCS feedback messages.
 */
export const enum PHPCSMessageType {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

/**
 * Information about a violation.
 */
export interface PHPCSMessage {
  message: string;
  source: string;
  severity: number;
  fixable: boolean;
  type: PHPCSMessageType;
  line: number;
  column: number;
}

/**
 * Error/Warning counts.
 */
export interface PHPCSCounts {
  errors: number;
  warnings: number;
  fixable: number;
}

/**
 * Violations for a single file.
 */
export interface PHPCSFileStatus {
  errors: number;
  warnings: number;
  messages: PHPCSMessage[];
}

/**
 * PHPCS JSON report shape.
 */
export interface PHPCSReport {
  totals: PHPCSCounts;
  files: {
    [key: string]: PHPCSFileStatus;
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
      new Range(line, column, line, column),
      `[${source}]\n${message}`,
    type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    ));
