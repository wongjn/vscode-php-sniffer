/**
 * @file
 * Utilities related to strings.
 */

/**
 * Converts a list of possibly empty strings into a single string.
 *
 * @param strings
 *   The list of strings.
 *
 * @return
 *   The strings as a single string delimited by a new line.
 */
export const stringsList = (strings: string[]) => strings.filter(Boolean).join('\n');

/**
 * Indentation style in use for indent detection.
 */
type IndentStyle = {
  // True if spaces are used, false for tabs.
  insertSpaces: boolean;
  // Number of spaces used per indent level.
  tabSize: number;
};

/**
 * Gets indentation information for a document.
 *
 * @param text
 *   The text.
 * @param indentFormat
 *   Indentation options for the document.
 * @return
 *   The indentation string.
 */
export function getIndentation(text: string, { insertSpaces, tabSize }: IndentStyle): string {
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

/**
 * Runs a function over a text snippet with normalization.
 *
 * @param text
 *   The text snippet to format.
 * @param formatOptions
 *   Configuration of indentation.
 * @param processor
 *   The processor function to run on the normalized snippet.
 */
export async function processSnippet(
  text: string,
  formatOptions: IndentStyle,
  processor: (text: string) => Promise<string>,
) {
  const indent: string = getIndentation(text, formatOptions);
  const needsPhpTag: boolean = !text.includes('<?');

  let inputText: string = text;

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
