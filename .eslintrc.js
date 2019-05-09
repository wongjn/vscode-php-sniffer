module.exports = {
  root: true,
  extends: [
    'airbnb-typescript/base',
    'plugin:import/typescript',
  ],
  env: {
    node: true,
  },
  rules: {
    'import/prefer-default-export': 0,
    'import/no-unresolved': [
      2,
      {
        ignore: [
          'vscode',
        ],
      },
    ],
    'import/no-extraneous-dependencies': [
      2,
      {
        devDependencies: [
          './src/test/**'
        ],
      },
    ],
  },
  overrides: {
    files: ['**/*.ts'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json',
    },
  }
};
