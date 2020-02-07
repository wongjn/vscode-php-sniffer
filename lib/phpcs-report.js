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
 * @param {string} line
 *   Line of text being validated.
 * @param {number} tabWidth
 *   Column width for a single tab character.
 * @param {number} column
 *   Original column number from phpcs.
 *
 * @return {number}
 *   Character number for VSCode.
 */
function tabConvert(line, tabWidth, column) {
  const count = line
    .slice(0, column - 1)
    .split('')
    .filter((char) => char === '\t')
    .length;
  return column - ((tabWidth - 1) * count);
}

/**
 * Creates a diagnostic from a PHPCS message.
 *
 * @param {string} text
 *   Text being validated.
 * @param {number} [tabWidth=1]
 *   Column width for a single tab character.
 *
 * @return {(a: PHPCSMessage) => import('vscode').Diagnostic}
 *   The diagnostic.
 */
const messageToDiagnostic = (text, tabWidth = 1) => ({ message, line, column, type, source }) => {
  const textLine = text.split('\n')[line - 1];
  const character = (textLine.includes('\t') ? tabConvert(textLine, tabWidth, column) : column) - 1;

  const diag = new Diagnostic(
    new Range(line - 1, character, line - 1, character),
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
 * @param {string} text
 *   Text being validated
 * @param {number} [tabWidth=1]
 *   Column width for a single tab character.
 *
 * @return {import('vscode').Diagnostic[]}
 *   The list of diagnostics.
 */
module.exports.reportFlatten = ({ files }, text, tabWidth = 1) => Object.values(files)
  .reduce((stack, { messages }) => [...stack, ...messages], /** @type {PHPCSMessage[]} */([]))
  .map(messageToDiagnostic(text, tabWidth));
