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
