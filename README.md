# PHPCBF Formatter

Formats PHP code using phpcbf.

## Features

Uses `phpcbf` on your system to format PHP code.

## Requirements

`phpcbf`, which is an executable from [PHP_Codesniffer](https://github.com/squizlabs/PHP_CodeSniffer).

## Extension Settings

This extension contributes the following settings:

* `phpcbf.executable`: The command to run to run `phpcbf`. Use this to specify a different executable if it is not in your global `PATH`, such as when using a project-scoped `phpcs` dependency.
* `phpcbf.standard`: The standards to check against. This is passed to the
`phpcbf` command as the value for `--standard`.
* `phpcbf.snippetExcludeSniffs`: Sniffs to exclude when formatting a code
snippet (such as formatting on paste or selection). This is passed to the
`phpcbf` command as the value for `--exclude` when **not** formatting a whole
file.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes
