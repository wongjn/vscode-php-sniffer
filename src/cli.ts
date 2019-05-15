/**
 * @file
 * Contains CLI utilities.
 */

export function mapToCliArgs(args: Map<string, string>, quote: boolean = false): string[] {
  return Array.from(args.entries())
    .filter(([key, value]) => value !== '' && key !== '')
    .map(([key, value]) => {
      const printValue = quote && value.includes(' ') ? `"${value}"` : value;
      return `--${key}=${printValue}`;
    });
}
