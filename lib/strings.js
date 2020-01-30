/**
 * @file
 * Utilities related to strings.
 */

/**
 * Converts a list of possibly empty strings into a single string.
 *
 * @param {any[]} strings
 *   The list of strings.
 *
 * @return {string}
 *   The strings as a single string delimited by a new line.
 */
module.exports.stringsList = (strings) => strings.filter(Boolean).join('\n');

/**
 * Converts formatting options to the indentation string.
 *
 * @param {import('vscode').FormattingOptions} indentFormat
 *   Indentation options for the document.
 *
 * @return {string}
 *   The string for a single indentation.
 */
const getIndentString = ({ insertSpaces, tabSize }) => (insertSpaces ? ' '.repeat(tabSize) : '\t');

/**
 * Splits a string into a an array of strings at a set size.
 *
 * @param {string} string
 *   The string to split up.
 * @param {number} size
 *   The size of each chunk, the last item will have the remainder string count.
 *
 * @return {string[]}
 *   The array of strings.
 */
const splitEvery = (string, size) => string.match(new RegExp(`.{1,${size}}`, 'g')) || [];

/**
 * Returns an indent counter.
 *
 * @param {string} indent
 *   The indent string unit.
 * @param {string} line
 *   The text line.
 *
 * @return {number}
 *   The indent count.
 */
const lineIndentCounter = (indent, line) => {
  const segment = splitEvery(line, indent.length);

  let count = 0;
  while (segment.shift() === indent) count += 1;

  return count;
};

/**
 * Creates a reducer for counting the minimum indentation across lines.
 *
 * @param {string} indent
 *   Indentation string.
 *
 * @return {(count: number, line: string) => number}
 *   The reducer.
 */
const lintIndentReducer = (indent) => (count, line) => (
  (line.length === 0 || count === 0)
    ? count
    : Math.min(lineIndentCounter(indent, line), count)
);

/**
 * Gets indentation information for a document.
 *
 * @param {string} indent
 *   Indentation string.
 *
 * @return {(lines: string[]) => string}
 *   The indentation getter that returns the indent count.
 */
const getIndentation = (indent) => (lines) => indent.repeat(
  lines.reduce(lintIndentReducer(indent), Number.MAX_SAFE_INTEGER),
);

/**
 * A string processor.
 *
 * @typedef {Object} Processor
 *
 * @prop {(string: string) => string} process
 *   Process a string.
 * @prop {(string: string) => string} unprocess
 *   Undo processing.
 */

/**
 * Creates an indent processor.
 *
 * @param {import('vscode').FormattingOptions} formatOptions
 *   Configuration of indentation.
 *
 * @return {Processor}
 *   The indent processor.
 */
const createIndentProcessor = (formatOptions) => {
  const indentGet = getIndentation(getIndentString(formatOptions));
  let indent = '';

  return {
    process(string) {
      indent = indentGet(string.split(/\r?\n/));
      return indent
        ? string.replace(new RegExp(`^${indent}`, 'mg'), '')
        : string;
    },
    unprocess(string) {
      return indent ? string.replace(/^(.+)/mg, `${indent}$1`) : string;
    },
  };
};

/**
 * Creates a PHP tag processor.
 *
 * @return {Processor}
 *   The PHP tag processor.
 */
const createPhpTagProcessor = () => {
  let needsPhpTag = false;

  return {
    process(string) {
      needsPhpTag = !string.includes('<?');
      return needsPhpTag ? `<?php\n${string}` : string;
    },
    unprocess(string) {
      return needsPhpTag ? string.replace(/<\?(php)?\n?/, '') : string;
    },
  };
};

/**
 * Runs a function over a text snippet with normalization.
 *
 * @param {string} text
 *   The text snippet to format.
 * @param {import('vscode').FormattingOptions} formatOptions
 *   Configuration of indentation.
 * @param {((text: string) => Promise<string>)|((text: string) => string)} processor
 *   The processor function to run on the normalized snippet.
 *
 * @return {Promise<string>}
 *   A promise that resolves to the processed result.
 */
module.exports.processSnippet = (text, formatOptions, processor) => {
  const indentProcessor = createIndentProcessor(formatOptions);
  const phpTagProcessor = createPhpTagProcessor();

  return Promise.resolve(text)
    .then(indentProcessor.process)
    .then(phpTagProcessor.process)
    .then(processor)
    .then(phpTagProcessor.unprocess)
    .then(indentProcessor.unprocess);
};
