import { defineConfig } from '@vscode/test-cli';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const projectRoot = path.resolve('.');

// Write a fresh workspace file to a temp path so VS Code never modifies the
// committed .vscode/test-workspace.code-workspace during test runs.
// The folders[0].path must be absolute because the file is not relative to .vscode/.
const tempWorkspace = path.join(os.tmpdir(), 'vscode-kaoto-test-workspace.code-workspace');
fs.writeFileSync(
  tempWorkspace,
  JSON.stringify(
    {
      folders: [{ path: path.join(projectRoot, 'test Fixture with speci@l chars') }],
      settings: {},
    },
    null,
    '\t',
  ),
);

const launchArgs = process.env.CI ? [] : ['--user-data-dir', path.join(os.tmpdir(), 'vscode-kaoto-test')];

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: tempWorkspace,
  launchArgs,
  mocha: {
    ui: 'tdd',
    color: true,
    timeout: 100000,
    reporter: 'mocha-jenkins-reporter',
  },
});
