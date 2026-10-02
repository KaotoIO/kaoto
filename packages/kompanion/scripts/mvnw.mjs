#!/usr/bin/env node

/**
 * Cross-platform entry point to the Maven wrapper, usable as a CLI or imported (`runMaven([...])`).
 * From package.json scripts in ANY workspace, call it as `yarn mvnw:run <args>`: backend-java
 * declares that script, and Yarn resolves a colon-named script declared by exactly one workspace
 * from every workspace. Nothing else should spell out a path to this file.
 *
 * Every route to Maven in this workspace goes through here, because no single spelling of the
 * wrapper resolves on both platforms: `./mvnw` needs a POSIX shell, `mvnw.cmd` does not exist off
 * Windows, and a bare `mvnw` is found only when cmd searches the working directory first - which
 * the `NoDefaultCurrentDirectoryInExePath` environment variable disables, and Git Bash sets it. So
 * the wrapper is always addressed by absolute path and never looked up on PATH or in the cwd.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cwd = join(dirname(fileURLToPath(import.meta.url)), '..');

const isWindows = process.platform === 'win32';
const wrapper = join(cwd, isWindows ? 'mvnw.cmd' : 'mvnw');

/**
 * Node has refused to spawn a `.cmd` without a shell since the CVE-2024-27980 fix. So on Windows
 * anything containing whitespace - `-Dexec.args=--dir <path>`, or the wrapper path itself under a
 * home directory with a space in it - has to be quoted, or cmd splits it into two Maven goals.
 */
function quote(arg) {
  if (!/\s/.test(arg)) return arg;
  if (arg.includes('"')) {
    throw new Error(`Cannot pass an argument containing a double quote through cmd: ${arg}`);
  }
  return `"${arg}"`;
}

/** Runs the wrapper from the backend-java directory, whatever the caller's cwd. */
export function runMaven(args) {
  // On Windows the whole command line is assembled here and handed to the shell as one string.
  // Passing an args array alongside `shell: true` would make Node concatenate it unescaped and
  // warn (DEP0190) on every single invocation - including `quarkus:dev`.
  const [command, spawnArgs] = isWindows ? [[wrapper, ...args].map(quote).join(' '), []] : [wrapper, args];

  const result = spawnSync(command, spawnArgs, {
    cwd: cwd,
    stdio: 'inherit',
    shell: isWindows,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runMaven(process.argv.slice(2)));
}
