import { equal, strictEqual } from 'assert';
import { stringsList, getIndentation, processSnippet } from '../../strings';

suite('String Utilities', function () {
  suite('stringsList()', function () {
    test('Values passed compile correctly', function () {
      const strings = ['a', 'b', 'c'];
      equal(stringsList(strings), 'a\nb\nc');
    });

    test('Empty strings are filtered out', function () {
      const strings = ['a', '', 'b', 'c', '', ''];
      equal(stringsList(strings), 'a\nb\nc');
    });
  });

  suite('getIndentation()', function () {
    function testGetIndentation(eol: string): void {
      test('Space indent detection with empty line', function () {
        const result = getIndentation(
          `  Lorem${eol}  Ipsum  dolor${eol}${eol}  Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '  ');
      });

      test('Space indent detection with 1 line of indentation only', function () {
        const result = getIndentation(
          `    Lorem${eol}    Ipsum  dolor${eol}  ${eol}    Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '  ');
      });

      test('Space indent detection with a non-indented line', function () {
        const result = getIndentation(
          `    Lorem${eol}    Ipsum  dolor${eol}ABCD${eol}    Amet`,
          {
            insertSpaces: true,
            tabSize: 2,
          },
        );

        equal(result, '');
      });

      test('Tab indent detection with empty line', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}${eol}\tAmet${eol}${eol}`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '\t');
      });

      test('Tab indent detection with 1 line of indentation only', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}\t${eol}\tAmet`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '\t');
      });

      test('Tab indent detection with a non-indented line', function () {
        const result = getIndentation(
          `\tLorem${eol}\tIpsum  dolor${eol}ABCD${eol}\tAmet`,
          {
            insertSpaces: false,
            tabSize: 1,
          },
        );

        equal(result, '');
      });
    }

    suite('LF line endings', function () {
      testGetIndentation('\n');
    });

    suite('CRLF line endings', function () {
      testGetIndentation('\r\n');
    });
  });

  type Format = {
    insertSpaces: boolean;
    tabSize: number;
  };

  /**
   * Utility to test aspects of processSnippet() for a snippet.
   *
   * @param description
   *   The human-readable description of the test.
   * @param text
   *   The snippet of text to pass to processSnippet().
   * @param processorInput
   *   The text string that should have been passed the the processor.
   * @param appendOutput
   *   Modification is tested by appending `\ntest` to the snippet; this
   *   argument specifies what that line actually looks like after final output
   *   (no need for newline at the start of the argument).
   * @param format
   *   The formatting options specifying how the snippet is indented.
   */
  function processSnippetTest(
    description: string,
    text: string,
    processorInput: string,
    appendOutput: string,
    format: Format = { insertSpaces: true, tabSize: 2 },
  ) {
    test(description, async function () {
      const assertProcessor = async (input: string): Promise<string> => {
        strictEqual(input, processorInput, 'Input text to processor.');
        return input;
      };
      strictEqual(
        await processSnippet(text, format, assertProcessor),
        text,
        'End result unchanged.',
      );

      const appendProcessor = async (input: string): Promise<string> => `${input}\ntext`;
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
