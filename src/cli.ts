/**
 * @file
 * Contains CLI utilities.
 */

/**
 * Maps CLI argument map into a formatted array of strings.
 *
 * @param args
 *   A map with string keys and values.
 *
 * @return
 *   The argument pairs in --a=b format.
 */
export function mapToCliArgs(args: Map<string, string>, quote: boolean = false): string[] {
  return Array.from(args.entries())
    .filter(([key, value]) => value !== '' && key !== '')
    .map(([key, value]) => {
      const printValue = quote && value.includes(' ') ? `"${value}"` : value;
      return `--${key}=${printValue}`;
    });
}
