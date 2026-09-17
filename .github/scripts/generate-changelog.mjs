#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * Generates a structured Markdown changelog from git history between the
 * previous release tag and HEAD.  Commits are routed into per-package sections
 * and categorised by conventional-commit type.
 *
 * Output is written to stdout so the calling workflow can capture it:
 *   body=$(node .github/scripts/generate-changelog.mjs)
 *
 * Extensibility: to add a new sub-package, insert one entry into PACKAGES.
 * The first entry whose scopePatterns matches wins.  Commits with no scope, or
 * a scope not matched by any entry, fall into the FALLBACK_PACKAGE.
 */

import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Package bucket definitions
//
// name        — internal key, matches conventional commit scope tokens
// label       — human-friendly heading shown in the release notes
// scopePatterns — array of RegExp tested against each individual scope token
//                 (multi-scope like "ci,vscode" is split on commas first)
//
// Routing rules:
//   • A commit whose scope matches ANY pattern in a package's scopePatterns
//     goes exclusively into that package.
//   • A commit with no scope, or whose scope matches nothing, goes into the
//     FALLBACK_PACKAGE (the last entry that has fallback: true).
//   • Commits that explicitly match multiple packages are duplicated into each.
// ---------------------------------------------------------------------------
const PACKAGES = [
  {
    name: 'vscode-kaoto',
    label: 'VS Code Extension',
    scopePatterns: [/^vscode$/i, /^kaoto-vscode$/i],
  },
  {
    name: '@kaoto/kaoto',
    label: 'Kaoto Core',
    fallback: true, // receives unscoped commits and unknown scopes
    scopePatterns: [
      /^ui$/i,
      /^kaoto$/i,
      /^datamapper$/i,
      /^data-mapper$/i,
      /^canvas$/i,
      /^catalog$/i,
      /^form$/i,
      /^nav$/i,
      /^kamelets?$/i,
      /^editor$/i,
      /^visualization$/i,
      /^rest$/i,
      /^rest-dsl$/i,
      /^restdsleditor$/i,
      /^xml$/i,
      /^citrus$/i,
      /^camel$/i,
      /^node-identity$/i,
      /^dynamic.?catalog$/i,
      /^storybook$/i,
      /^lint$/i,
      /^linter$/i,
      /^eslint$/i,
      /^sonar(qube)?$/i,
      /^migration$/i,
      /^serializers?$/i,
      /^tests?$/i,
      /^e2e$/i,
      /^weekly$/i,
      /^workflows?$/i,
      /^ci$/i,
      /^docs?$/i,
      /^resource$/i,
      /^shell$/i,
      /^exports?$/i,
    ],
  },
  {
    name: '@kaoto/kaoto-web',
    label: 'Kaoto Web UI',
    scopePatterns: [/^kaoto-web$/i, /^web$/i],
  },
];

const FALLBACK_PACKAGE = PACKAGES.find((p) => p.fallback) ?? PACKAGES.at(-1);

// ---------------------------------------------------------------------------
// Category definitions — order determines output order
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { header: '✨ Features', types: new Set(['feat']) },
  { header: '🐛 Bug Fixes', types: new Set(['fix']) },
  { header: '🔧 Maintenance', types: new Set(['refactor', 'perf', 'build', 'style']) },
  { header: '📦 Dependencies', types: new Set(['__deps__']) }, // special: chore with deps* scope
  { header: '🔩 Chores', types: new Set(['chore']) },
  { header: '🧪 Tests', types: new Set(['test', 'e2e']) },
  { header: '📚 Documentation', types: new Set(['docs']) },
  { header: '🔁 CI', types: new Set(['ci']) },
  { header: '🔀 Other', types: new Set(['__other__']) }, // fallback bucket
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run git with arguments array avoiding shell interpolation. */
function runGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** Find the tag immediately before HEAD (the most recent existing tag). */
function getPreviousTag() {
  const tag = runGit(['describe', '--tags', '--abbrev=0', 'HEAD']);
  return tag ?? null;
}

/** Conventional commit regex — captures type, scope, breaking marker, and description. */
const CC_RE = /^(\w+)(\(([^)]+)\))?(!)?: (.+)$/;

/**
 * Scopes that always map to Maintenance regardless of the commit type prefix.
 * Catches mistyped prefixes like fix(sonar) or fx(sonar) which are tooling
 * work, not user-facing bug fixes.
 */
const MAINTENANCE_SCOPES = /^(sonar(qube)?|lint(er)?|eslint)$/i;

/**
 * Resolve which category key to use for a given type + scope combination.
 * Returns the CATEGORIES header string, or a sentinel for the fallback bucket.
 */
function resolveCategory(type, scope) {
  // Scope-based overrides take priority over the commit type prefix
  if (scope) {
    const tokens = scope
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Any scope that is a tooling/quality tool → Maintenance
    if (tokens.some((token) => MAINTENANCE_SCOPES.test(token))) return '🔧 Maintenance';
    // chore with a deps/deps-dev scope → Dependencies
    if (type === 'chore' && tokens.some((token) => token.startsWith('deps'))) return '__deps__';
  }
  for (const cat of CATEGORIES) {
    if (cat.types.has(type)) return cat.header;
  }
  return '__other__';
}

/**
 * Split a (potentially multi-value) scope string like "ci,vscode" into tokens,
 * then match each token against the package scope patterns.
 *
 * Returns the matched package names, or [FALLBACK_PACKAGE.name] when nothing
 * matches (including when scope is null/empty).
 */
function resolvePackages(scope) {
  if (!scope) return [FALLBACK_PACKAGE.name];

  const tokens = scope
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const matched = new Set();
  for (const token of tokens) {
    for (const pkg of PACKAGES) {
      if (pkg.scopePatterns.some((re) => re.test(token))) {
        matched.add(pkg.name);
      }
    }
  }

  return matched.size > 0 ? [...matched] : [FALLBACK_PACKAGE.name];
}

/** Format a single commit as a Markdown bullet. */
function formatBullet(description, isBreaking, hash) {
  const short = hash.slice(0, 7);
  const prefix = isBreaking ? '⚠️ **BREAKING CHANGE** ' : '';
  return `- ${prefix}${description} (\`${short}\`)`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const prevTag = getPreviousTag();
const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';

console.error(`Generating changelog for range: ${range}`); // status to stderr

const logOutput = runGit(['log', range, '--pretty=format:%H%x09%s%x09%B%x00', '--']);

if (logOutput === null) {
  console.error(`Error: Failed to retrieve git log for range ${range}`);
  process.exit(1);
}

if (logOutput === '') {
  process.stdout.write('_No changes since last release._\n');
  process.exit(0);
}

// Split on the NUL delimiter so multi-line commit bodies don't corrupt parsing
const rawCommits = logOutput
  .split('\0')
  .map((s) => s.trim())
  .filter(Boolean);

// Structure: packageName → categoryHeader → bullet[]
/** @type {Map<string, Map<string, string[]>>} */
const sections = new Map(PACKAGES.map((p) => [p.name, new Map()]));

for (const raw of rawCommits) {
  const [hash, subject, ...bodyParts] = raw.split('\t');
  const body = bodyParts.join('\n');

  if (!hash || !subject) continue;

  const hasBreakingFooter = /^BREAKING[- ]CHANGE:\s+/m.test(body);
  const match = CC_RE.exec(subject);

  let scope, breaking, description, categoryKey;

  if (match) {
    const type = match[1];
    scope = match[3] ?? null;
    breaking = Boolean(match[4]) || hasBreakingFooter;
    description = match[5];
    categoryKey = resolveCategory(type, scope);
  } else {
    // Unparseable commit — preserve full subject in the Other fallback
    scope = null;
    breaking = hasBreakingFooter;
    description = subject;
    categoryKey = '__other__';
  }

  // Resolve display header from category key
  const categoryHeader =
    categoryKey === '__other__'
      ? '🔀 Other'
      : categoryKey === '__deps__'
        ? '📦 Dependencies'
        : categoryKey;

  const bullet = formatBullet(description, breaking, hash);

  for (const pkgName of resolvePackages(scope)) {
    const pkgSection = sections.get(pkgName);
    if (!pkgSection) continue;
    if (!pkgSection.has(categoryHeader)) pkgSection.set(categoryHeader, []);
    pkgSection.get(categoryHeader).push(bullet);
  }
}

// ---------------------------------------------------------------------------
// Render output
// ---------------------------------------------------------------------------

const orderedHeaders = CATEGORIES.map((c) => c.header);
const outputParts = [];

for (const pkg of PACKAGES) {
  const pkgSection = sections.get(pkg.name);
  if (!pkgSection || pkgSection.size === 0) continue;

  // Use the human-friendly label as the section heading
  const sectionLines = [`## ${pkg.label}`, ''];

  for (const header of orderedHeaders) {
    const bullets = pkgSection.get(header);
    if (!bullets || bullets.length === 0) continue;
    sectionLines.push(`### ${header}`, ...bullets, '');
  }

  outputParts.push(sectionLines.join('\n'));
}

if (outputParts.length === 0) {
  process.stdout.write('_No categorised changes since last release._\n');
} else {
  process.stdout.write(outputParts.join('\n---\n\n'));
}
