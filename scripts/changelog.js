/**
 * @file
 * Modifies CHANGELOG.md during npm-version command.
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const changelog = join(__dirname, '..', 'CHANGELOG.md');
const content = readFileSync(changelog, { encoding: 'utf8' });

const date = new Date();
const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
const day = (date.getUTCDate()).toString().padStart(2, '0');
const dateString = `${date.getUTCFullYear()}-${month}-${day}`;

const replace = `## [${process.env.npm_package_version}] - ${dateString}`;

const updated = content.replace(/^## \[Unreleased\]$/m, replace);
writeFileSync(changelog, updated);
