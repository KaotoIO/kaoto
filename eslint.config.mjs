// @ts-check
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // Enable type-aware linting (required for prefer-readonly / typescript:S2933).
  // Scoped to package source dirs — excludes root-level config/tooling files that
  // have no tsconfig. Each package's own tsconfig.json is resolved via project:true.
  {
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'packages/ui-tests/cypress/**/*.{ts,tsx}',
      'packages/ui-tests/stories/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      ...pluginReact.configs.flat.recommended.plugins,
      'react-hooks': pluginReactHooks,
    },
  },
  {
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
    },
  },
  eslintConfigPrettier,
  eslintPluginPrettier,
];
