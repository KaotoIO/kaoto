import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CANDIDATES =
  process.platform === 'win32'
    ? ['C:\\Program Files\\Git\\cmd\\git.exe']
    : ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git'];

export const GIT_BIN = CANDIDATES.find((p) => existsSync(p));

if (!GIT_BIN) {
  throw new Error(`git not found in trusted locations: ${CANDIDATES.join(', ')}`);
}

export function git(args, options = {}) {
  return execFileSync(GIT_BIN, args, { encoding: 'utf8', ...options });
}
