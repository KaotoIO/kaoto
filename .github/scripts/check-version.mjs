#!/usr/bin/env node
/**
 * Validates that all project package.json files carry the expected version.
 *
 * Usage: node scripts/check-version.mjs <expected-version>
 * Example: node scripts/check-version.mjs 2.12.0
 *
 * Exits 0 when all versions match, 1 when any disagree.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const PACKAGES = [
  'package.json',
  'packages/kaoto-vscode/package.json',
  'packages/kaoto-web/package.json',
  'packages/ui-tests/package.json',
  'packages/ui/package.json',
];

const expected = process.argv[2];

if (!expected) {
  console.error('Usage: node scripts/check-version.mjs <expected-version>');
  process.exit(1);
}

let failed = false;

for (const rel of PACKAGES) {
  const file = resolve(ROOT, rel);
  const { version } = JSON.parse(readFileSync(file, 'utf8'));
  if (version !== expected) {
    console.error(`✗ ${rel}: expected "${expected}", found "${version}"`);
    failed = true;
  } else {
    console.log(`✓ ${rel}: ${version}`);
  }
}

if (failed) {
  console.error('\nVersion mismatch — update all package.json files before releasing.');
  process.exit(1);
}

console.log('\nAll versions match.');
