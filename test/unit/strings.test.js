const { strictEqual } = require('assert');
const { stringsList, processSnippet } = require('../../lib/strings');

suite('String Utilities', function () {
  suite('stringsList()', function () {
    test('Values passed compile correctly', function () {
      const strings = ['a', 'b', 'c'];
      strictEqual(stringsList(strings), 'a\nb\nc');
    });

    test('Empty strings are filtered out', function () {
      const strings = ['a', '', 'b', 'c', '', ''];
      strictEqual(stringsList(strings), 'a\nb\nc');
    });
  });

  /**
   * Utility to test aspects of processSnippet() for a snippet.
   *
   * @param {string} description
   *   The human-readable description of the test.
   * @param {string} text
   *   The snippet of text to pass to processSnippet().
   * @param {string} processorInput
   *   The text string that should have been passed the the processor.
   * @param {string} appendOutput
   *   Modification is tested by appending `\ntest` to the snippet; this
   *   argument specifies what that line actually looks like after final output
   *   (no need for newline at the start of the argument).
   * @param {import('vscode').FormattingOptions} [format={ insertSpaces: true, tabSize: 2 }]
   *   The formatting options specifying how the snippet is indented.
   */
  function processSnippetTest(
    description,
    text,
    processorInput,
    appendOutput,
    format = { insertSpaces: true, tabSize: 2 },
  ) {
    test(description, async function () {
      const assertProcessor = async (input) => {
        strictEqual(input, processorInput, 'Input text to processor.');
        return input;
      };

      strictEqual(
        await processSnippet(text, format, assertProcessor),
        text,
        'End result unchanged.',
      );

      const appendProcessor = async (input) => `${input}\ntext`;
      strictEqual(
        await processSnippet(text, format, appendProcessor),
        `${text}\n${appendOutput}`,
        'End result with append.',
      );
    });
  }

  suite('processSnippet()', function () {
    processSnippetTest(
      'Has PHP tag and no indent',
      '<?php\nfoo\nbar\nbaz',
      '<?php\nfoo\nbar\nbaz',
      'text',
    );

    processSnippetTest(
      'Has PHP tag and indent (spaces)',
      `  <?php
  foo
   bar
  baz
    loremIpsum`,
      `<?php
foo
 bar
baz
  loremIpsum`,
      '  text',
    );

    processSnippetTest(
      'Has PHP tag and indent (tabs)',
      `\t<?
\tfoo
\t bar
\tbaz
\t  loremIpsum`,
      `<?
foo
 bar
baz
  loremIpsum`,
      '\ttext',
      { insertSpaces: false, tabSize: 1 },
    );

    processSnippetTest(
      'Has PHP tag and indent with blank lines (spaces)',
      `
  <?

  foo
    bar

  baz
`,
      `
<?

foo
  bar

baz
`,
      '  text',
    );

    processSnippetTest(
      'Has PHP tag and indent with blank lines (tabs)',
      `
\t<?

\tfoo
\t\tbar

\tbaz
`,
      `
<?

foo
\tbar

baz
`,
      '\ttext',
      { insertSpaces: false, tabSize: 1 },
    );

    processSnippetTest(
      'No PHP tag and no indent',
      'foo\nbar\nbaz',
      '<?php\nfoo\nbar\nbaz',
      'text',
    );

    processSnippetTest(
      'No PHP tag and indent (spaces)',
      `  foo
   bar
  baz
    loremIpsum`,
      `<?php
foo
 bar
baz
  loremIpsum`,
      '  text',
    );

    processSnippetTest(
      'No PHP tag and indent (tabs)',
      `\tfoo
\t bar
\tbaz
\t  loremIpsum`,
      `<?php
foo
 bar
baz
  loremIpsum`,
      '\ttext',
      { insertSpaces: false, tabSize: 1 },
    );

    processSnippetTest(
      'No PHP tag and indent with blank lines (spaces)',
      `
  foo
    bar

  baz
`,
      `<?php

foo
  bar

baz
`,
      '  text',
    );

    processSnippetTest(
      'No PHP tag and indent with blank lines (tabs)',
      `
\tfoo
\t\tbar

\tbaz
`,
      `<?php

foo
\tbar

baz
`,
      '\ttext',
      { insertSpaces: false, tabSize: 1 },
    );
  });
});
