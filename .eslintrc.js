module.exports = {
  root: true,
  extends: [
    'airbnb-base',
  ],
  rules: {
    'no-underscore-dangle': 0,
    'object-curly-newline': ['error', { multiline: true, minProperties: 99 }],
    'import/no-unresolved': [
      'error',
      { commonjs: true, caseSensitive: true, ignore: ['vscode'] }
    ],
  },
};
