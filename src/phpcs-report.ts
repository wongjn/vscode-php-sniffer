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
  warning: number;
  fixable?: number;
}

/**
 * Violations for a single file.
 */
export interface PHPCSFileStatus extends PHPCSCounts {
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
