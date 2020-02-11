<?php

/**
 * Outputs PHP_Codesniffer's resolved tabWidth.
 *
 * Designed for use with --report=json. Needs an extra closing curly brace '}'
 * after output to be able to be decoded as json.
 */

printf(
  '{ "vscodeOptions": { "tabWidth": %d }, "result": ',
  $this->config->tabWidth ? intval($this->config->tabWidth) : 1
);
