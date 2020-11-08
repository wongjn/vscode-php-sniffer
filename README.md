# PHP Sniffer

[![Build Status](https://travis-ci.com/wongjn/vscode-php-sniffer.svg?branch=master)](https://travis-ci.com/wongjn/vscode-php-sniffer)
[![PHP Sniffer on the Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version-short/wongjn.php-sniffer.svg)](https://marketplace.visualstudio.com/items?itemName=wongjn.php-sniffer)

Uses [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer) to format
and lint (mainly) PHP code.

## Features

- Runs `phpcs` to lint code.
- Runs `phpcbf` to format fixable code validation errors, using the built-in
  commands "Format Document" or "Format Selection" (PHP only).
  - One may need to set this extension as the default language formatter for
    some languages. The following snippet is an example for PHP that can be
    added in a `settings.json`:
    ```json
    {
      "[php]": {
        "editor.defaultFormatter": "wongjn.php-sniffer"
      }
    }
    ```

## Requirements

- [PHP](https://php.net)
- [PHP_Codesniffer](https://github.com/squizlabs/PHP_CodeSniffer)

## Extension Settings

### Quick Setup

`settings.json`:

```json
{
  "phpSniffer.autoDetect": true
}
```

And if your projects look like this:

```
workspace-folder/
  vendor/
    bin/
      phpcs
      phpcbf
  .phpcs.xml
```

Validation and formatting will work (see below for alternative filenames for
`.phpcs.xml`).

### In Depth

This extension contributes the following settings:

* `phpSniffer.run`: When to run `phpcs` (the linter). Can be `onSave`, `onType`
or `never`.
* `phpSniffer.onTypeDelay`: When `phpSniffer.run` is `onType`, this sets the
amount of milliseconds the validator will wait after typing has stopped before
it will run. The validator will also cancel an older run if the run is on the
same file.
* `phpSniffer.extraFiles`: [Glob patterns](https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
of extra files to match that this extension should run on. Useful for standards
that don't just validate PHP files. This extension will **always** run on PHP
files — be sure to have your `files.associations` setting correctly setup for
PHP files.
* `phpSniffer.executablesFolder`: The **folder** where both `phpcs` and `phpcbf`
executables are. Use this to specify a different executable if it is not in your
global `PATH`, such as when using `PHP_Codesniffer` as a project-scoped
dependency. Can be absolute, or relative to the workspace folder.
* `phpSniffer.autoDetect`: Set to `true` for the extension to auto-detect
`phpSniffer.executablesFolder` as `./vendor/bin/` per workspace folder (applies
only if `phpSniffer.executablesFolder` is empty).
* `phpSniffer.standard`: The standards to check against. This is passed to the
`phpcbf` and `phpcs` executables as the value for `--standard`. Can be absolute,
or relative to the workspace folder. If not set,
[PHP_CodeSniffer will attempt to find a file to use](https://github.com/squizlabs/PHP_CodeSniffer/wiki/Advanced-Usage#using-a-default-configuration-file),
at the root of the currently open file's workspace folder in the following order:
  1. `.phpcs.xml`
  2. `phpcs.xml`
  3. `.phpcs.xml.dist`
  4. `phpcs.xml.dist`
* `phpSniffer.snippetExcludeSniffs`: Sniffs to exclude when formatting a PHP
code snippet (such as when _formatting on paste_ or on the command
`format on selection`). This is passed to the `phpcbf` command as the value for
`--exclude` when **not** formatting a whole file.
* `phpSniffer.disableWhenDebugging`: Disable sniffing when any debug session is
active.

## Known Issues

### Windows Hanging PHP Process

When `phpcs` encounters a malformed array declaration, [it can sometimes hang from an error](https://github.com/squizlabs/PHP_CodeSniffer/issues/2142).
This is exacerbated by the fact that we do not have access to the spawned `php`
process in the extension code and cannot kill `php.exe` directly. This causes
many non-exiting PHP processes on Windows machines which can really slow down
the machine.
The fix for this is to update `squizlabs/PHP_Codesniffer` in use to `>=3.4.2`.
