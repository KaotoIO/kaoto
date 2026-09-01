// eslint.config.mjs
import ts from '@typescript-eslint/parser';
import tsEslint from '@typescript-eslint/eslint-plugin';
import chaiFriendly from 'eslint-plugin-chai-friendly';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['**/*.test.js', 'node_modules/*', 'dist/*', 'out/*'],
  },
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: ts,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.ui-tests.json', './tsconfig.unit-tests.json'],
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
      globals: {
        browser: 'readonly',
        es2024: true,
        mocha: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      '@chai-friendly': chaiFriendly,
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off', // allows require statements outside of imports
      'no-async-promise-executor': 'off', // Deactivated for now as I do not know how to fix it safely
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
      ],
      curly: 'warn',
      eqeqeq: 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none', // ignore unused variables in catch blocks
        },
      ],
      'no-throw-literal': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      'no-unused-expressions': 'off', // Disable the default rule
      '@chai-friendly/no-unused-expressions': 'error', // Use chai-friendly version
      'prettier/prettier': 'error',
    },
  },
];
