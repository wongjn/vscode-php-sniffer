# PHP Sniffer

[![Build Status](https://travis-ci.com/wongjn/vscode-php-sniffer.svg?branch=master)](https://travis-ci.com/wongjn/vscode-php-sniffer)
[![PHP Sniffer on the Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version-short/wongjn.php-sniffer.svg)](https://marketplace.visualstudio.com/items?itemName=wongjn.php-sniffer)

Uses [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer) to format
and lint PHP code.

## Features

- Runs `phpcs` to lint PHP code.
- Runs `phpcbf` to format fixable PHP code validation errors.

## Requirements

- [PHP](https://php.net)
- [PHP_Codesniffer](https://github.com/squizlabs/PHP_CodeSniffer)

## Extension Settings

This extension contributes the following settings:

* `phpSniffer.run`: When to run `phpcs` (the linter). Can be `onSave` or
`onType`.
* `phpSniffer.onTypeDelay`: When `phpSniffer.run` is `onType`, this sets the
amount of milliseconds the validator will wait after typing has stopped before
it will run. The validator will also cancel an older run if the run is on the
same file.
* `phpSniffer.executablesFolder`: The folder where both `phpcs` and `phpcbf`
executables are. Use this to specify a different executable if it is not in your
global `PATH`, such as when using `PHP_Codesniffer` as a project-scoped
dependency. Include a trailing slash. Can be absolute or relative to the first
folder in the workspace.
* `phpSniffer.standard`: The standards to check against. This is passed to the
`phpcbf` and `phpcs` executables as the value for `--standard`. Can be absolute
or relative to the first folder in the workspace.
* `phpSniffer.snippetExcludeSniffs`: Sniffs to exclude when formatting a code
snippet (such as when _formatting on paste_ or on the command
`format on selection`). This is passed to the `phpcbf` command as the value for
`--exclude` when **not** formatting a whole file.
* `phpSniffer.windowsHardkill`: **Windows only.** Enables a tough `php` process
killing for Windows machines. See
[Windows Hanging PHP Process](#windows-hanging-php-process) below for details.
* `phpSniffer.windowsPhpCli`: **Windows only.** Requires
`phpSniffer.windowsHardkill` to be `true`. The name of the `php` executable that
`phpcs`/`phpcbf` runs with so that this extension can hard-kill it. See
[Windows Hanging PHP Process](#windows-hanging-php-process) below for details.

## Known Issues

### Windows Hanging PHP Process

When `phpcs` encounters a malformed array declaration, [it can sometimes hang from an error](https://github.com/squizlabs/PHP_CodeSniffer/issues/2142).
This is exacerbated by the fact that we do not have access to the spawned `php`
process in the extension code and cannot kill `php.exe` directly.

This extension thus searches for the process by name in
`phpSniffer.windowsPhpCli` to kill it. Since just matching by this name could
kill other non-related processes, the extension limits by `CPU TIME` of between
2s and 10s.
