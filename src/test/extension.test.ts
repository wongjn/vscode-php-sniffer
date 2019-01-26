import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';

suite('PHP Sniffer Tests', function () {
  const projectFolder = path.join(__dirname, 'project');
  const fixturesSource = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');

  suiteSetup(function () {
    fs.emptyDirSync(projectFolder);
    return fs.copy(fixturesSource, projectFolder);
  });

  suiteTeardown(function () {
    return fs.emptyDir(projectFolder);
  });
});
