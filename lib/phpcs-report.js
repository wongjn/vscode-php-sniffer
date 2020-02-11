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
 * Options passed back to the extension.
 *
 * @typedef VscodeOptions
 *
 * @prop {number} tabWidth
 *   Count of spaces each tab is worth.
 */

/**
 * Enhanced PHPCS report.
 *
 * @typedef {Object} PHPCSEnhancedReport
 *
 * @property {VscodeOptions} vscodeOptions
 *   Options to pass back to the extension.
 * @property {PHPCSReport} result
 *   The original PHPCS report.
 */

/**
 * Creates a diagnostic from a PHPCS message.
 *
 * @param {string} line
 *   Line of text being validated.
 * @param {number} tabWidth
 *   Column width for a single tab character resolved in phpcs.
 * @param {number} column
 *   Original column number from phpcs.
 *
 * @return {number}
 *   Character number for VSCode.
 */
function tabConvert(line, tabWidth, column) {
  let counter = 0;

  let i = 0;
  while (counter < column) {
    counter += line[i] === '\t' ? tabWidth - (counter % tabWidth) : 1;
    i += 1;
  }

  return i;
}

/**
 * Creates a diagnostic from a PHPCS message.
 *
 * @param {string} text
 *   Text being validated.
 * @param {number} tabWidth
 *   Column width for a single tab character resolved in PHPCS.
 *
 * @return {(a: PHPCSMessage) => import('vscode').Diagnostic}
 *   The diagnostic.
 */
const messageToDiagnostic = (text, tabWidth) => ({ message, line, column, type, source }) => {
  const textLine = text.split('\n')[line - 1];
  const character = (textLine.includes('\t') ? tabConvert(textLine, tabWidth, column) : column) - 1;

  const diag = new Diagnostic(
    new Range(line - 1, character, line - 1, character),
    message,
    type === PHPCSMessageType.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  );

  diag.source = 'PHPCS';
  diag.code = source;

  return diag;
};

/**
 * Parses a PHPCS JSON report to a set of diagnostics.
 *
 * @param {PHPCSEnhancedReport} report
 *   The PHPCS report in JSON format.
 * @param {string} text
 *   Text being validated.
 *
 * @return {import('vscode').Diagnostic[]}
 *   The list of diagnostics.
 */
module.exports.reportFlatten = ({ vscodeOptions, result: { files } }, text) => Object.values(files)
  .reduce((stack, { messages }) => [...stack, ...messages], /** @type {PHPCSMessage[]} */([]))
  .map(messageToDiagnostic(text, vscodeOptions.tabWidth));
