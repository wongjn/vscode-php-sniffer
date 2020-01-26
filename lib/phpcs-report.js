/**
 * @file
 * Shape description for PHPCS JSON report.
 */

const { Diagnostic, DiagnosticSeverity, Range } = require('vscode');

/**
 * Types of PHPCS feedback messages.
 *
 * @readonly
 * @enum {string}
 */
const PHPCSMessageType = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
};

/**
 * Violation message structure from PHPCS.
 *
 * @typedef PHPCSMessage
 *
 * @prop {string} message
 *   Feedback message for the violation.
 * @prop {string} source
 *   Name of the sniff that found the violation.
 * @prop {number} severity
 *   Severity of the message, configured from the standard being checked with,
 *   scale of 0—5.
 * @prop {boolean} fixable
 *   True if this violation could be fixed automatically by PHPCBF.
 * @prop {'ERROR'|'WARNING'} type
 *   Type of violation.
 * @prop {number} line
 *   Line number where the problem occurs.
 * @prop {number} column
 *   Column number where the problem occurs.
 */

/**
 * Report for a single file.
 *
 * @typedef FileReport
 *
 * @prop {number} errors
 *   Number of violations of type `ERROR` in the file.
 * @prop {number} warnings
 *   Number of violations of type `WARNINGS` in the file.
 * @prop {PHPCSMessage[]} messages
 *   The list of all violations within the file.
 */

/**
 * PHPCS JSON report shape.
 *
 * @typedef PHPCSReport
 *
 * @prop {Object} totals
 *   Violation counts.
 * @prop {number} totals.errors
 *   Number of violations of type `ERROR`.
 * @prop {number} totals.warnings
 *   Number of violations of type `WARNINGS`.
 * @prop {number} totals.fixable
 *   Number of fixable violations.
 * @prop {Object<string,FileReport>} files
 *   Dictionary of files with violations, indexed by filename.
 */

/**
 * Creates a diagnostic from a PHPCS message.
 *
 * @param {PHPCSMessage} message
 *   The message from PHPCS.
 *
 * @return {import('vscode').Diagnostic}
 *   The diagnostic.
 */
const messageToDiagnostic = ({ message, line, column, type, source }) => {
  const diag = new Diagnostic(
    new Range(line - 1, column - 1, line - 1, column - 1),
    message,
    type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  );
  diag.source = `PHPCS:${source}`;
  return diag;
};

/**
 * Parses a PHPCS JSON report to a set of diagnostics.
 *
 * @param {PHPCSReport} report
 *   The PHPCS report in JSON format.
 *
 * @return {import('vscode').Diagnostic[]}
 *   The list of diagnostics.
 */
module.exports.reportFlatten = ({ files }) => Object.values(files)
  .reduce((stack, { messages }) => [...stack, ...messages], /** @type {PHPCSMessage[]} */([]))
  .map(messageToDiagnostic);
