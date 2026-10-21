import { defineConfig } from '@vscode/test-cli';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const projectRoot = path.resolve('.');
const fixtureName = 'test Fixture with speci@l chars';

// Every run gets its own temp folder so it never depends on a previous run's cleanup:
// tests write into the workspace and settings, and an interrupted run leaves both behind.
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-vscode-unit-'));
process.on('exit', () => {
  try {
    fs.rmSync(runRoot, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // A leftover VS Code process may still hold files; the OS temp cleanup takes care of it.
  }
});

// Open a copy of the fixture so tests never modify the committed files.
const workspaceFolder = path.join(runRoot, fixtureName);
fs.cpSync(path.join(projectRoot, fixtureName), workspaceFolder, { recursive: true });

// A workspace file keeps workspace-scoped settings written by the tests out of the fixture.
// The folders[0].path must be absolute because the file is not next to the folder.
const tempWorkspace = path.join(runRoot, 'kaoto-unit-tests.code-workspace');
fs.writeFileSync(tempWorkspace, JSON.stringify({ folders: [{ path: workspaceFolder }], settings: {} }, null, '\t'));

// A fresh user data dir drops global settings left by an earlier run and does not collide with
// a VS Code test instance an interrupted run left behind. CI keeps the default
// .vscode-test/user-data folder, which is fresh per job and uploaded as the test logs artifact.
const launchArgs = process.env.CI ? [] : ['--user-data-dir', path.join(runRoot, 'user-data')];

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
    // The slowest test takes ~1.3s in CI and extension activation ~15s; a lower limit makes a
    // blocked await fail fast instead of stalling the run. Raise it per test with this.timeout().
    timeout: debugBootloader ? 0 : 20_000,
    ...(debugBootloader ? { require: debugBootloader } : {}),
  },
});
