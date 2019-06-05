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
 * Parsed PHPCS individual message.
 */
export interface ParsedMessage {
  line: number;
  column: number;
  message: string;
  error: boolean;
}

/**
 * Parses a PHPCS report to a single dimensional list of messages.
 *
 * @param report
 *   The PHPCS report.
 * @return
 *   The list of any errors.
 */
export const reportFlatten = ({ files }: PHPCSReport): ParsedMessage[] => Object.values(files)
  .reduce<PHPCSMessage[]>((stack, { messages }) => [...stack, ...messages], [])
  .map(({
    message, line, column, type, source,
  }) => ({
    line,
    column,
    message: `[${source}]\n${message}`,
    error: type === PHPCSMessageType.ERROR,
  }));
