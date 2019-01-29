# Change Log
All notable changes to the "PHP Sniffer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
