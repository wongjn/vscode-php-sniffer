const assert = require('assert');
const path = require('path');
const { unlink, promises: fsAsync } = require('fs');
const { CancellationTokenSource, ConfigurationTarget, workspace, Uri } = require('vscode');
const { createRunner } = require('../../lib/runner');
const { execPromise, FIXTURES_PATH } = require('../utils');

/**
 * Returns a workspace-change detecting promise.
 *
 * @return {Promise<import('vscode').WorkspaceFoldersChangeEvent>}
 *   A promise that resolves once a workspace folder change event has ocurred.
 */
const onDidChangeWorkspaceFoldersPromise = () => new Promise((resolve) => {
  const subscription = workspace.onDidChangeWorkspaceFolders((event) => {
    subscription.dispose();
    resolve(event);
  });
});

suite('Runner', function () {
  const mainFolder = Uri.file(path.join(__dirname, '/fixtures/config'));
  const a = Uri.file(path.join(__dirname, '/fixtures/config/a'));

  suite('createRunner()', function () {
    suite('Basic functionality', function () {
      suiteSetup(async function () {
        // Set up workspace folder.
        const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
        workspace.updateWorkspaceFolders(0, 0, { uri: mainFolder });
        await onChange;

        // Get config.
        const aConfig = workspace.getConfiguration('phpSniffer', a);

        // Set workspace config.
        await Promise.all([
          aConfig.update('standard', 'A-Standard', ConfigurationTarget.Workspace),
          aConfig.update('executablesFolder', '../execs/', ConfigurationTarget.Workspace),
          aConfig.update('snippetExcludeSniffs', ['ExcludeMe', 'IgnoreThis'], ConfigurationTarget.Workspace),
        ]);
      });

      suiteTeardown(async function () {
        const aConfig = workspace.getConfiguration('phpSniffer', a);

        // Revert configuration.
        await Promise.all([
          aConfig.update('standard', undefined, ConfigurationTarget.Workspace),
          aConfig.update('executablesFolder', undefined, ConfigurationTarget.Workspace),
          aConfig.update('snippetExcludeSniffs', undefined, ConfigurationTarget.Workspace),
        ]);

        // Revert workspace folders.
        const onRevert = onDidChangeWorkspaceFoldersPromise(workspace);
        workspace.updateWorkspaceFolders(0, 1);
        return onRevert;
      });

      suite('.phpcs()', function () {
        test('Binary file location', function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          return assert.doesNotReject(run.phpcs('a'));
        });

        test('Returns JSON-parsed STDOUT', async function () {
          const tokenSource = new CancellationTokenSource();
          const run = createRunner(tokenSource.token, a);

          assert.strictEqual(String(await run.phpcs('a')), '[object Object]');
        });

        test('Token cancellation returns null', async function () {
          const tokenSource = new CancellationTokenSource();
          const run = createRunner(tokenSource.token, a);

          const result = run.phpcs('a');
          setTimeout(() => tokenSource.cancel(), 1);

          assert.strictEqual(await result, null);
        });

        test('Function parameter passed through as STDIN', async function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          const stdin = String(Math.random());

          assert.strictEqual((await run.phpcs(stdin)).stdin, stdin);
        });

        test('Args are passed through', async function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          const result = await run.phpcs('a');

          assert(result.arg.includes(` --stdin-path=${a.fsPath} `));
          assert(result.arg.includes(' --report=json '));
          assert(result.arg.includes(' --standard=A-Standard '));
          assert(result.arg.includes(' --bootstrap='));
          assert(result.arg.includes(' --runtime-set ignore_warnings_on_exit 1 '));
          assert(result.arg.includes(' --runtime-set ignore_errors_on_exit 1 '));
          assert(result.arg.includes(' -q '));
          assert(result.arg.endsWith(' -'));
        });
      });

      suite('.phpcbf()', function () {
        test('Binary file location', function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          return assert.doesNotReject(run.phpcbf('a'));
        });

        test('Returns raw STDOUT string', async function () {
          const tokenSource = new CancellationTokenSource();
          const run = createRunner(tokenSource.token, a);

          assert.strictEqual(typeof await run.phpcbf('a'), 'string');
        });

        test('Token cancellation returns original text', async function () {
          const tokenSource = new CancellationTokenSource();
          const run = createRunner(tokenSource.token, a);
          const stdin = String(Math.random());

          const result = run.phpcbf(stdin);
          setTimeout(() => tokenSource.cancel(), 1);

          assert.strictEqual(await result, stdin);
        });

        test('Function parameter passed through as STDIN', async function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          const stdin = String(Math.random());
          const result = JSON.parse(await run.phpcbf(stdin));

          assert.strictEqual(result.stdin, stdin);
        });

        test('Args are passed through', async function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          const result = JSON.parse(await run.phpcbf('a'));

          assert(result.arg.includes(` --stdin-path=${a.fsPath} `));
          assert(result.arg.includes(' --standard=A-Standard '));
          assert(result.arg.includes(' --bootstrap='));
          assert(result.arg.endsWith(' -'));
        });

        test('Sniffs are excluded for partial document', async function () {
          const run = createRunner(new CancellationTokenSource().token, a, false);
          const result = JSON.parse(await run.phpcbf('a'));

          assert(result.arg.includes(' --exclude=ExcludeMe,IgnoreThis '));
        });
      });

      suite('No trailing slash needed for "phpSniffer.executablesFolder"', function () {
        let beforeValue;

        suiteSetup(function () {
          const config = workspace.getConfiguration('phpSniffer', a);

          // Save config value for reverting.
          beforeValue = config.inspect('executablesFolder').workspaceValue;

          // Set workspace config.
          return workspace
            .getConfiguration('phpSniffer', a)
            .update('executablesFolder', '../execs', ConfigurationTarget.Workspace);
        });

        suiteTeardown(async function () {
          // Revert workspace config.
          return workspace
            .getConfiguration('phpSniffer', a)
            .update('executablesFolder', beforeValue, ConfigurationTarget.Workspace);
        });

        test('Result', function () {
          const run = createRunner(new CancellationTokenSource().token, a);
          return assert.doesNotReject(run.phpcs('a'));
        });
      });
    });

    suite('Folder resolution', function () {
      const subfolder = Uri.file(path.join(__dirname, '/fixtures/config/subfolder'));
      const secondaryFolder = Uri.file(path.join(__dirname, '/fixtures/config0'));
      const b = Uri.file(path.join(__dirname, '/fixtures/config/subfolder/b'));
      const c = Uri.file(path.join(__dirname, '/fixtures/config0/c'));

      suiteSetup(async function () {
        // Set up additional workspace folders.
        const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
        workspace.updateWorkspaceFolders(
          0,
          0,
          { uri: mainFolder },
          { uri: subfolder },
          { uri: secondaryFolder },
        );
        await onChange;

        // Set workspace config.
        const config = workspace.getConfiguration('phpSniffer', a);
        await Promise.all([
          config.update('standard', 'A-Standard', ConfigurationTarget.Workspace),
          config.update('executablesFolder', '../execs/', ConfigurationTarget.Workspace),
        ]);
      });

      suiteTeardown(async function () {
        // Set workspace config.
        const config = workspace.getConfiguration('phpSniffer', a);
        await Promise.all([
          config.update('standard', undefined, ConfigurationTarget.Workspace),
          config.update('executablesFolder', undefined, ConfigurationTarget.Workspace),
        ]);

        // Revert workspace folders.
        const onRevert = onDidChangeWorkspaceFoldersPromise(workspace);
        workspace.updateWorkspaceFolders(0, 3);
        return onRevert;
      });

      test('Main document', async function () {
        const run = createRunner(new CancellationTokenSource().token, a);
        assert((await run.phpcs('a')).arg.includes('--standard=A-Standard'));
      });

      test('Document in a subfolder', async function () {
        const run = createRunner(new CancellationTokenSource().token, b);
        assert((await run.phpcs('b')).arg.includes('--standard=B-Standard'));
      });

      test('Document in a secondary workspace folder', async function () {
        const run = createRunner(new CancellationTokenSource().token, c);
        assert((await run.phpcs('c')).arg.includes('--standard=C-Standard'));
      });
    });

    suite('Automatic detection', function () {
      suite('Executables folder discovered', function () {
        const folderUri = Uri.file(path.resolve(__dirname, 'fixtures/auto'));
        const subjectUri = Uri.file(path.resolve(__dirname, 'fixtures/auto/target'));

        suiteSetup(async function () {
          // Set up workspace folder.
          const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
          workspace.updateWorkspaceFolders(0, 0, { uri: folderUri });
          await onChange;

          // Set workspace config.
          await workspace
            .getConfiguration('phpSniffer', subjectUri)
            .update('autoDetect', true, ConfigurationTarget.Workspace);
        });

        suiteTeardown(async function () {
          // Revert workspace config.
          await workspace
            .getConfiguration('phpSniffer', subjectUri)
            .update('autoDetect', undefined, ConfigurationTarget.Workspace);

          // Revert workspace folder.
          const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
          workspace.updateWorkspaceFolders(0, 1);
          await onChange;
        });

        test('Result', async function () {
          this.timeout(0);
          const run = createRunner(new CancellationTokenSource().token, subjectUri);
          assert.strictEqual((await run.phpcs('Foo')).CALLED, 'THIS');
        });
      });

      suite('PHP_CodeSniffer auto-discovers xml ruleset', function () {
        const folderUri = Uri.file(FIXTURES_PATH);
        const subjectUri = Uri.file(path.resolve(FIXTURES_PATH, 'target'));
        const rulesetFile = path.resolve(FIXTURES_PATH, '.phpcs.xml');

        suiteSetup(async function () {
          // Set up workspace folder.
          const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
          workspace.updateWorkspaceFolders(0, 0, { uri: folderUri });
          await onChange;

          // Create ruleset file.
          const onCreate = fsAsync.writeFile(rulesetFile, `<?xml version="1.0"?>
<ruleset name="Fixture Ruleset">
  <rule ref="Generic.PHP.LowerCaseConstant"/>
</ruleset>`);
          const composerInstall = execPromise('composer install --no-dev', { cwd: FIXTURES_PATH });
          this.timeout(20000);

          // Set workspace config.
          const onConfigChange = workspace
            .getConfiguration('phpSniffer', subjectUri)
            .update('autoDetect', true, ConfigurationTarget.Workspace);

          return Promise.all([onCreate, onConfigChange, composerInstall]);
        });

        suiteTeardown(async function () {
          // Revert workspace config.
          await workspace
            .getConfiguration('phpSniffer', subjectUri)
            .update('autoDetect', undefined, ConfigurationTarget.Workspace);

          // Delete ruleset file.
          const onDelete = new Promise((resolve, reject) => {
            unlink(rulesetFile, (err) => (err ? reject(err) : resolve()));
          });

          // Revert workspace folder.
          const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
          workspace.updateWorkspaceFolders(0, 1);

          return Promise.all([onDelete, onChange]);
        });

        test('Result', async function () {
          const run = createRunner(new CancellationTokenSource().token, folderUri);
          assert.strictEqual(await run.phpcbf('<?php $foo = TRUE;'), '<?php $foo = true;');
        });
      });
    });
  });

  suite('Bootstrap file for <file> directives', function () {
    const testContent = '<?php $foo = true;';

    const folderUri = Uri.file(FIXTURES_PATH);
    const subjectUri = Uri.file(path.resolve(FIXTURES_PATH, 'target'));

    suiteSetup(async function () {
      // Set up workspace folder.
      const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
      workspace.updateWorkspaceFolders(0, 0, { uri: folderUri });
      await onChange;

      this.timeout(20000);
      const config = workspace.getConfiguration('phpSniffer', subjectUri);

      return Promise.all([
        execPromise('composer install --no-dev', { cwd: FIXTURES_PATH }),
        config.update('executablesFolder', './vendor/bin/', ConfigurationTarget.Workspace),
      ]);
    });

    suiteTeardown(async function () {
      await workspace
        .getConfiguration('phpSniffer', subjectUri)
        .update('executablesFolder', undefined, ConfigurationTarget.Workspace);

      // Revert workspace folder.
      const onChange = onDidChangeWorkspaceFoldersPromise(workspace);
      workspace.updateWorkspaceFolders(0, 1);
      return onChange;
    });

    suite('Directory', function () {
      // Set workspace config.
      suiteSetup(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', './bootstrap-file.directory.xml', ConfigurationTarget.Workspace),
      );

      // Revert workspace config.
      suiteTeardown(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', undefined, ConfigurationTarget.Workspace),
      );

      test('Not matches <file>', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'ignore-me/index.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 0);
      });

      test('Matches <file>', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/index.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 1);
      });
    });

    suite('File', function () {
      // Set workspace config.
      suiteSetup(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', './bootstrap-file.file.xml', ConfigurationTarget.Workspace),
      );

      // Revert workspace config.
      suiteTeardown(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', undefined, ConfigurationTarget.Workspace),
      );

      test('Not matches <file>', async function () {
        {
          const uri = Uri.file(path.resolve(FIXTURES_PATH, 'ignore-me/index.php'));
          const run = createRunner(new CancellationTokenSource().token, uri);
          assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 0);
        }
        {
          const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/class.php'));
          const run = createRunner(new CancellationTokenSource().token, uri);
          assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 0);
        }
      });

      test('Matches <file>', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/index.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 1);
      });
    });

    suite('Graceful handling of non-existent paths in rulesets', function () {
      // Set workspace config.
      suiteSetup(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', './bootstrap-file.error.xml', ConfigurationTarget.Workspace),
      );

      // Revert workspace config.
      suiteTeardown(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', undefined, ConfigurationTarget.Workspace),
      );

      test('No JavaScript errors', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/index.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 1);
      });
    });

    suite('Extending', function () {
      // Set workspace config.
      suiteSetup(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', './include/bootstrap-file.inherit.xml', ConfigurationTarget.Workspace),
      );

      // Revert workspace config.
      suiteTeardown(
        () => workspace
          .getConfiguration('phpSniffer', subjectUri)
          .update('standard', undefined, ConfigurationTarget.Workspace),
      );

      test('Not matches <file>', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/class.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 0);
      });

      test('Matches <file>', async function () {
        const uri = Uri.file(path.resolve(FIXTURES_PATH, 'include/index.php'));
        const run = createRunner(new CancellationTokenSource().token, uri);
        assert.strictEqual((await run.phpcs(testContent)).result.totals.errors, 1);
      });
    });
  });
});
