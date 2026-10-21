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

// VS Code removes NODE_OPTIONS before launching the extension host. Preload the
// terminal's debugger bootloader there so CLI auto-attach can reach the tests.
const preloadPattern = /(?:^|\s)(?:--require(?:=|\s+)|-r\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/g;
function findDebugBootloader() {
  if (!process.env.VSCODE_INSPECTOR_OPTIONS) return undefined;

  const nodeOptions = process.env.NODE_OPTIONS ?? '';

  for (const match of nodeOptions.matchAll(preloadPattern)) {
    const preloadPath = match[1] ?? match[2] ?? match[3];

    if (/[\\/]bootloader\.js$/.test(preloadPath)) {
      return preloadPath;
    }
  }

  return undefined;
}

const debugBootloader = findDebugBootloader();

export default defineConfig({
  files: 'out-unit-tests/test/**/*.test.js',
  workspaceFolder: tempWorkspace,
  launchArgs,
  mocha: {
    ui: 'tdd',
    color: true,
    timeout: debugBootloader ? 0 : 100000,
    ...(debugBootloader ? { require: debugBootloader } : {}),
  },
});
