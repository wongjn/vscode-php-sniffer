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
 * Indentation utility.
 */
interface Indentation {
  // RegExp to replace the indent found.
  replace: RegExp;
  // Indent raw string.
  indent: string;
}

/**
 * Gets indentation information for a document.
 *
 * @param lines
 *   The text as an array of strings per line.
 * @param indentFormat
 *   Indentation options for the document.
 */
export function getIndentation(
  lines: string[],
  { insertSpaces, tabSize }: IndentStyle,
): Indentation | null {
  const unit = insertSpaces ? ' '.repeat(tabSize) : '\t';
  const indentMatcher = new RegExp(`^((?:${unit})+)`);

  const count = lines.reduce((tally, line) => {
    // Already at minimum 0, do nothing more.
    if (tally === 0) return tally;

    const [linePre, indent] = line.split(indentMatcher, 3);

    // No indent.
    if (linePre.length > 0) return 0;
    // Blank line; does not affect result.
    if (!indent) return tally;

    return Math.min(indent.length / unit.length, tally);
  }, Number.MAX_SAFE_INTEGER);

  // No indentation found.
  if (count === 0) {
    return null;
  }

  return {
    replace: new RegExp(`^(${unit}){${count}}`),
    indent: unit.repeat(count),
  };
}
