# Change Log
All notable changes to the "PHP Sniffer" extension will be documented in this file.

## [Unreleased]
### Added
- Add `phpSniffer.autoDetect` setting to auto-discover executables at
  `[workspaceFolder]/vendor/bin` if `phpSniffer.executablesFolder` is unset.

### Changed
- Execution of `phpcbf` and `phpcs` will always use the workspace folder for a
  given file (if it is in a workspace)

### Removed
- Removed Windows-specific PHP process killing (use PHP_Codesniffer >= 3.4.2)

## [1.1.5] - 2019-07-04
### Added
- Add build status to README
- Add Visual Studio Marketplace badge to README
- Add tests

### Changed
- Reduce extension footprint

### Fixed
- Pass stdin-path to phpcbf

## [1.1.4] - 2019-01-29
### Changed
- Update CHANGELOG.md

### Fixed
- Ensure blank arguments are not passed
- Standardize quotes through to CLI execution

## [1.1.3] - 2019-01-29
### Fixed
- Fix double-quoting in cli execution in Linux

### Removed
- Remove session filter on windows process search

## [1.1.2] - 2019-01-29
### Fixed
- Fix validator command regression

## [1.1.1] - 2019-01-29
### Added
- Add LICENSE

### Changed
- Improve PHP CLI process killing on Windows

## [1.1.0] - 2019-01-12
### Added
- Add editorconfig
- Add identifying prefix for console logs

### Changed
- Catch blank stdout
- Respect file-path configs

### Fixed
- Ensure output PHPCS args do not disrupt reporting
- Revert "Another attempt to fix memory leak with PHP CLI"

## [1.0.0] - 2019-01-08
### Changed
- - Allow path settings to resolve relatively

## [0.1.5] - 2018-12-27
### Fixed
- Another attempt to fix memory leak with PHP CLI

## [0.1.4] - 2018-12-17
### Changed
- Log stderr
- Switch to exec function to add timeout

## [0.1.3] - 2018-12-13
### Fixed
- Attempt to kill process on error

## [0.1.2] - 2018-11-28
### Fixed
- Attempt to alleviate PHP process memory leak

## [0.1.1] - 2018-11-27
### Security
- Patch Event-Stream package vulnerability

## [0.1.0] - 2018-11-26
- Initial release

[Unreleased]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.5...HEAD
[1.1.5]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/wongjn/vscode-php-sniffer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/wongjn/vscode-php-sniffer/compare/v0.1.5...v1.0.0
[0.1.5]: https://github.com/wongjn/vscode-php-sniffer/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/wongjn/vscode-php-sniffer/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/wongjn/vscode-php-sniffer/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/wongjn/vscode-php-sniffer/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/wongjn/vscode-php-sniffer/compare/0.1.0...v0.1.1
[0.1.0]: https://github.com/wongjn/vscode-php-sniffer/tree/0.1.0
