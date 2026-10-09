// @ts-check
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';

import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    // Enforce the most-specific Vitest assertions (SonarQube typescript:S5906).
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/prefer-to-have-length': 'error',
      'vitest/prefer-to-be': 'error',
      // Prevent incomplete assertions (SonarQube typescript:S2970, S2699).
      'vitest/valid-expect': 'error',
    },
  },
  {
    // Prevent redundant act() wrappers (SonarQube typescript:S8980).
    files: ['**/*.test.{ts,tsx}'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      'testing-library/no-unnecessary-act': 'error',
    },
  },
  {
    // Tests run with `isolate: false`: a vi.mock() in one file leaks into the other files of the same worker,
    // or doesn't apply when the module was already loaded. Global mocks belong in vitest-mocks-setup.ts.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock|unmock|doUnmock)$/]",
          message:
            'Module mocks leak between test files because Vitest isolation is disabled. Spy on the real object with vi.spyOn(), render with real providers, or add a global mock to vitest-mocks-setup.ts.',
        },
      ],
    },
  },
];
