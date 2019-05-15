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
