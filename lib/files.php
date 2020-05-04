<?php

/**
 * Bootstrap file for PHP_CodeSniffer for stdin paths.
 *
 * Ensures the currently checked stdin paths matches a <file> directive from at
 * least one ruleset used.
 */

if (!$this->config->stdinPath) {
  return;
}

// The current processing file path.
$processing_file = $this->config->stdinPath;
// Whether there are any file directives in any rulesets.
$has_files = FALSE;

foreach ($this->ruleset->paths as $ruleset_path) {
  $ruleset = @simplexml_load_string(file_get_contents($ruleset_path));

  if (!$ruleset) {
    continue;
  }

  $ruleset_dir = dirname($ruleset_path);
  foreach ($ruleset->file as $file_path) {
    // There are file directives.
    $has_files = TRUE;

    // Get full path of file directive, always assumed to be relative to the
    // ruleset file.
    $full_path = realpath($ruleset_dir . DIRECTORY_SEPARATOR . (string) $file_path);

    // Found a match, no more processing needed, exit.
    if ($full_path && strpos($processing_file, $full_path) === 0) return;
  }
}

// There are file directives, and the processing file did not match any of them;
// ignore the processing file.
if ($has_files) {
  $this->ruleset->ignorePatterns[$processing_file] = 'absolute';
}
