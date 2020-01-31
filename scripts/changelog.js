/**
 * @file
 * Modifies CHANGELOG.md during npm-version command.
 */

// @ts-nocheck

const fs = require('fs').promises;
const path = require('path');
const { version } = require('../package.json');

const filePath = path.resolve(__dirname, '../CHANGELOG.md');

fs.readFile(filePath, 'utf8')
  .then(
    (content) => content
      .replace(/(## \[Unreleased\])/, `$1\n\n## [${version}] - ${new Date().toISOString().slice(0, 10)}`)
      .replace(/(\[Unreleased\]:) (.+)(\d+\.\d+\.\d+)(.+)/, `$1 $2${version}$4\n[${version}]: $2$3...v${version}`),
  )
  .then((content) => fs.writeFile(filePath, content));
