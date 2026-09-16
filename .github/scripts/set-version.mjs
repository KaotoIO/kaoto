#!/usr/bin/env node
/**
 * Sets the version in all project package.json files.
 *
 * Usage: node .github/scripts/set-version.mjs <new-version>
 * Example: node .github/scripts/set-version.mjs 2.13.0
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const PACKAGES = [
  'package.json',
  'packages/kaoto-vscode/package.json',
  'packages/kaoto-web/package.json',
  'packages/ui-tests/package.json',
  'packages/ui/package.json',
];

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node .github/scripts/set-version.mjs <new-version>');
  process.exit(1);
}

for (const rel of PACKAGES) {
  const file = resolve(ROOT, rel);
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`✓ ${rel} -> ${newVersion}`);
}

console.log(`\nSuccessfully updated all packages to ${newVersion}`);
