module.exports = {
  root: true,
  env: { node: true, commonjs: true, es2020: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest' },
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.js'],
      env: { jest: true },
    },
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
