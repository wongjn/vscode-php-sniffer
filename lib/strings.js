/**
 * @file
 * Utilities related to strings.
 */

/**
 * Converts a list of possibly empty strings into a single string.
 *
 * @param {string[]} strings
 *   The list of strings.
 *
 * @return {string}
 *   The strings as a single string delimited by a new line.
 */
const stringsList = (strings) => strings.filter(Boolean).join('\n');
module.exports.stringsList = stringsList;

/**
 * Gets indentation information for a document.
 *
 * @param {string} text
 *   The text.
 * @param {import('vscode').FormattingOptions} indentFormat
 *   Indentation options for the document.
 *
 * @return {string}
 *   The indentation string.
 */
function getIndentation(text, { insertSpaces, tabSize }) {
  const unit = insertSpaces ? ' '.repeat(tabSize) : '\t';
  // Expression to match at least one indent unit.
  const indentMatcher = new RegExp(`^((?:${unit})+)`);

  const count = text.split(/\r?\n/).reduce((tally, line) => {
    // Already at minimum 0 or skip empty line.
    if (tally === 0 || line.length === 0) return tally;

    const match = line.match(indentMatcher);
    return match ? Math.min(match[1].length / unit.length, tally) : 0;
  }, Number.MAX_SAFE_INTEGER);

  return unit.repeat(count);
}

module.exports.getIndentation = getIndentation;

/**
 * Runs a function over a text snippet with normalization.
 *
 * @param {string} text
 *   The text snippet to format.
 * @param {import('vscode').FormattingOptions} formatOptions
 *   Configuration of indentation.
 * @param {(text: string) => Promise<string>} processor
 *   The processor function to run on the normalized snippet.
 *
 * @return {Promise<string>}
 *   A promise that resolves to the processed result.
 */
async function processSnippet(text, formatOptions, processor) {
  const indent = getIndentation(text, formatOptions);
  const needsPhpTag = !text.includes('<?');

  let inputText = text;

  // Remove snippet-wide indentation before sending to phpcbf.
  if (indent) {
    inputText = inputText.replace(new RegExp(`^${indent}`, 'mg'), '');
  }

  // Add <?php tag to the snippet so that phpcbf recognizes it as PHP code.
  if (needsPhpTag) {
    inputText = `<?php\n${inputText}`;
  }

  let result = await processor(inputText);

  if (result) {
    // Remove <?php tag if we added it.
    if (needsPhpTag) {
      result = result.replace(/<\?(php)?\n?/, '');
    }
    // Restore snippet indentation.
    if (indent) {
      result = result.replace(/^(.+)/mg, `${indent}$1`);
    }
  }

  return result;
}

module.exports.processSnippet = processSnippet;
