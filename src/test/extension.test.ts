import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import { workspace, Uri } from 'vscode';

suite('PHP Sniffer Tests', function () {
  const projectFolder = path.join(__dirname, 'project');
  const fixturesSource = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');

  suiteSetup(function (done) {
    this.timeout(0);

    fs.removeSync(projectFolder);
    fs.copySync(fixturesSource, projectFolder);

    workspace.updateWorkspaceFolders(0, null, { uri: Uri.file(projectFolder) });
    workspace.onDidChangeWorkspaceFolders(done);
  });

  suiteTeardown(function () {
    fs.removeSync(projectFolder);
  });
});
