/**
 * @file
 * Modifies CHANGELOG.md during npm-version command.
 *
 * @todo Rewrite for updated CHANGELOG format.
 */
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Update changelog', () => rl.close());
