const assert = require('assert');
const path = require('path');
const { CancellationTokenSource, ConfigurationTarget, workspace, Uri } = require('vscode');
const { createRunner } = require('../../lib/runner');

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
          assert(result.arg.endsWith(' -'));
        });

        test('Sniffs are excluded for partial document', async function () {
          const run = createRunner(new CancellationTokenSource().token, a, false);
          const result = JSON.parse(await run.phpcbf('a'));

          assert(result.arg.includes(' --exclude=ExcludeMe,IgnoreThis '));
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
  });
});
