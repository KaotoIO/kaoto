import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectJobs } from './ci-changes.mjs';

const none = { ui: false, web: false, 'vscode-smoke': false, 'vscode-full': false, deploy: false, e2e: false, chromatic: false };
const all = Object.fromEntries(Object.keys(none).map((key) => [key, true]));

test('UI changes validate the UI and embedded extension (smoke groups only) without deployment', () => {
  assert.deepEqual(selectJobs(['packages/ui/src/App.tsx']), {
    ...none,
    ui: true,
    'vscode-smoke': true,
    e2e: true,
    chromatic: true,
  });
});

test('extension changes select full integration groups and deployment tests only', () => {
  assert.deepEqual(selectJobs(['packages/kaoto-vscode/src/extension.ts']), {
    ...none,
    'vscode-full': true,
    deploy: true,
  });
});

test('web-only changes retain web validation without unrelated packages', () => {
  assert.deepEqual(selectJobs(['packages/kaoto-web/src/App.tsx']), { ...none, web: true });
});

test('Cypress-only changes do not select extension or visual regression tests', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/cypress/e2e/example.cy.ts']), {
    ...none,
    ui: true,
    e2e: true,
  });
});

test('Storybook-only changes preserve UI validation, Cypress and Chromatic', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/stories/Example.stories.tsx']), {
    ...none,
    ui: true,
    e2e: true,
    chromatic: true,
  });
});

test('Cypress configuration changes preserve Chromatic as well as Cypress', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/cypress.config.ts']), {
    ...none,
    ui: true,
    e2e: true,
    chromatic: true,
  });
});

test('Cypress-only pushes preserve Chromatic, whose path exclusion only applied to PRs', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/cypress/e2e/example.cy.ts'], 'push'), {
    ...none,
    ui: true,
    e2e: true,
    chromatic: true,
  });
});

test('Cypress plus documentation preserves the original Chromatic PR path-filter behavior', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/cypress/e2e/example.cy.ts', 'README.md']), {
    ...none,
    ui: true,
    e2e: true,
    chromatic: true,
  });
});

test('shared test tooling selects Cypress and Storybook', () => {
  assert.deepEqual(selectJobs(['packages/ui-tests/package.json']), {
    ...none,
    ui: true,
    e2e: true,
    chromatic: true,
  });
});

test('mixed UI + extension changes take the union: both smoke and full flags set, with deployment', () => {
  assert.deepEqual(
    selectJobs(['packages/ui/src/App.tsx', 'packages/kaoto-vscode/src/extension.ts', 'packages/kaoto-web/src/App.tsx']),
    all,
  );
});

test('shared configuration and CI changes select all validation', () => {
  for (const file of [
    'package.json',
    'yarn.lock',
    '.yarnrc.yml',
    'tsconfig.base.json',
    'eslint.config.mjs',
    '.stylelintrc',
    '.prettierrc',
    '.yarn/releases/yarn-4.13.0.cjs',
    '.github/workflows/build-lint-test.yml',
    '.github/actions/kaoto-vscode-setup-tools/action.yml',
    '.github/scripts/ci-changes.mjs',
    'packages/future-package/src/index.ts',
  ]) {
    assert.deepEqual(selectJobs([file]), all, file);
  }
});

test('documentation-only changes and empty diffs need no package jobs', () => {
  assert.deepEqual(selectJobs(['README.md', 'docs/plans/example.md', 'assets/readme/example.png']), none);
  assert.deepEqual(selectJobs(['.vscode/settings.json', '.vscode/extensions.json']), none);
  assert.deepEqual(selectJobs([]), none);
});

test('documentation cannot suppress validation for a mixed change', () => {
  assert.deepEqual(selectJobs(['docs/example.md', 'yarn.lock']), all);
  assert.deepEqual(selectJobs(['.vscode/settings.json', 'yarn.lock']), all);
});

test('manual runs or unavailable comparison commits select everything', () => {
  assert.deepEqual(selectJobs(null), all);
});

test('the CLI writes Actions outputs for dispatch, first push and a missing comparison', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'kaoto-ci-selection-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const eventPath = join(directory, 'event.json');
  const outputPath = join(directory, 'output');
  for (const event of [
    {},
    { before: '0'.repeat(40), after: '1'.repeat(40) },
    { before: '1'.repeat(40), after: '2'.repeat(40) },
  ]) {
    writeFileSync(eventPath, JSON.stringify(event));
    writeFileSync(outputPath, '');
    execFileSync(process.execPath, [fileURLToPath(new URL('./ci-changes.mjs', import.meta.url))], {
      cwd: directory,
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outputPath },
      stdio: 'pipe',
    });
    const outputs = Object.fromEntries(
      readFileSync(outputPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split('=')),
    );
    assert.deepEqual(outputs, Object.fromEntries(Object.keys(all).map((key) => [key, 'true'])));
  }
});
