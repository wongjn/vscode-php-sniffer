/* eslint no-useless-constructor: 0, no-empty-function: 0 */

/**
 * CLI arguments helper class.
 */
export class CliArguments {
  /**
   * Constructs a new CliArguments.
   *
   * @param args
   *   Arguments map to initialize with.
   */
  constructor(protected args: Map<string, string> = new Map()) { }

  /**
   * Set an argument value.
   *
   * @param key
   * @param value
   */
  public set(key: string, value: string): CliArguments {
    this.args.set(key, value);
    return this;
  }

  /**
   * Get all arguments as an array to pass to child_process.spawn.
   *
   * @param quote
   *   Whether to quote values. Should be true if `shell` option is set to true,
   *   otherwise false.
   */
  public getAll(quote: boolean = false): string[] {
    return Array.from(this.args.entries())
      .filter(([, value]) => value !== '')
      .map(([key, value]) => {
        const printValue = quote && value.includes(' ') ? `"${value}"` : value;
        return `--${key}=${printValue}`;
      });
  }
}
