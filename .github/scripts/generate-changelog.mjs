#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * Generates a structured Markdown changelog from merged PRs between the
 * previous release tag and HEAD.  PRs are routed into per-package sections
 * and categorised by conventional-commit type in their PR title.
 *
 * Output is written to stdout so the calling workflow can capture it:
 *   body=$(node .github/scripts/generate-changelog.mjs)
 *
 * Requires GH_TOKEN (or GITHUB_TOKEN) to call the GitHub API.
 * Falls back to a git-log based changelog when the token is absent.
 *
 * Extensibility: to add a new sub-package, insert one entry into PACKAGES.
 * The first entry whose scopePatterns matches wins.  PRs with no scope, or
 * a scope not matched by any entry, fall into the FALLBACK_PACKAGE.
 */

import { execFileSync } from 'node:child_process';
import { env } from 'node:process';

// ---------------------------------------------------------------------------
// Package bucket definitions
//
// name        — internal key, matches conventional commit scope tokens
// label       — human-friendly heading shown in the release notes
// scopePatterns — array of RegExp tested against each individual scope token
//                 (multi-scope like "ci,vscode" is split on commas first)
//
// Routing rules:
//   • A PR whose scope matches ANY pattern in a package's scopePatterns
//     goes exclusively into that package.
//   • A PR with no scope, or whose scope matches nothing, goes into the
//     FALLBACK_PACKAGE (the last entry that has fallback: true).
//   • PRs that explicitly match multiple packages are duplicated into each.
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
    fallback: true, // receives unscoped PRs and unknown scopes
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

/** Returns true if sha is reachable from HEAD (i.e. merged into the checked-out branch). */
function isAncestor(sha) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the most recent reachable release tag before HEAD,
 * ignoring ephemeral snapshot tags (-SNAPSHOT-<short-sha>).
 */
function getPreviousTag() {
  const tag = runGit(['describe', '--tags', '--abbrev=0', '--exclude=*-SNAPSHOT-*', 'HEAD']);
  return tag ?? null;
}

/** Get the ISO timestamp of a tag (or null). */
function getTagDate(tag) {
  // for-each-ref returns the correct creation date for both annotated and lightweight tags
  return runGit(['for-each-ref', `refs/tags/${tag}`, '--format=%(creatordate:iso-strict)']);
}

/** Conventional commit regex — captures type, scope, breaking marker, and description. */
const CC_RE = /^(\w+)(\(([^)]+)\))?(!)?: (.+)$/;

/** Bot accounts to exclude from author attribution. */
const BOT_PATTERN = /\[bot\]$/i;

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
  if (scope) {
    const tokens = scope
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.some((token) => MAINTENANCE_SCOPES.test(token))) return '🔧 Maintenance';
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

/** Format a single PR as a Markdown bullet. */
function formatBullet(description, isBreaking, login, prNumber, repo) {
  const prefix = isBreaking ? '⚠️ **BREAKING CHANGE** ' : '';
  const author = login ? ` by @${login}` : '';
  const pr = prNumber ? ` ([#${prNumber}](https://github.com/${repo}/pull/${prNumber}))` : '';
  return `- ${prefix}${description}${author}${pr}`;
}

/**
 * Fetch all merged PRs from the GitHub API between prevTagDate and HEAD.
 * Uses pagination to get all results.
 *
 * @param {string} repo  e.g. "KaotoIO/kaoto"
 * @param {string} token GitHub token
 * @param {string|null} since ISO date string — only PRs merged after this date
 * @returns {Promise<Array>} array of PR objects
 */
async function fetchMergedPRs(repo, token, since) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const prs = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`GitHub API error ${res.status} fetching PRs from ${repo}`);
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const pr of batch) {
      // Skip unmerged PRs
      if (!pr.merged_at) continue;
      // Skip PRs merged before the previous tag — but keep paginating since
      // results are sorted by updated_at, not merged_at
      if (since && pr.merged_at <= since) continue;
      // Skip PRs whose merge commit is not reachable from HEAD
      if (pr.merge_commit_sha && !isAncestor(pr.merge_commit_sha)) continue;

      prs.push(pr);
    }

    if (batch.length < 100) break;
    page++;
  }

  return prs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const prevTag = getPreviousTag();
console.error(`Generating changelog since tag: ${prevTag ?? '(beginning)'}`);

const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
// GITHUB_REPOSITORY is always set in GitHub Actions (e.g. "KaotoIO/kaoto").
// Falls back to parsing the git remote URL for local runs.
const repo =
  env.GITHUB_REPOSITORY ??
  (runGit(['remote', 'get-url', 'origin']) ?? '').match(/[:/]([^/:]+\/[^/.]+?)(\.git)?$/)?.[1] ??
  null;

if (!token || !repo) {
  // Fallback: git log based changelog without author attribution
  console.error('Warning: GH_TOKEN not set or remote URL unresolvable — falling back to git log.');

  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const logOutput = runGit(['log', range, '--pretty=format:%H%x09%s%x09%B%x00', '--']);

  if (!logOutput) {
    process.stdout.write('_No changes since last release._\n');
    process.exit(0);
  }

  const sections = new Map(PACKAGES.map((p) => [p.name, new Map()]));

  for (const raw of logOutput.split('\0').map((s) => s.trim()).filter(Boolean)) {
    const [hash, subject, ...bodyParts] = raw.split('\t');
    if (!hash || !subject) continue;
    const body = bodyParts.join('\n');
    const match = CC_RE.exec(subject);
    const type = match?.[1] ?? '__other__';
    const scope = match?.[3] ?? null;
    const description = match?.[5] ?? subject;
    const breaking = Boolean(match?.[4]) || /^BREAKING[- ]CHANGE:/m.test(body);
    const categoryKey = resolveCategory(type, scope);
    let categoryHeader = categoryKey;
    if (categoryKey === '__deps__') categoryHeader = '📦 Dependencies';
    else if (categoryKey === '__other__') categoryHeader = '🔀 Other';
    const bullet = `- ${breaking ? '⚠️ **BREAKING CHANGE** ' : ''}${description} (\`${hash.slice(0, 7)}\`)`;
    for (const pkgName of resolvePackages(scope)) {
      const sec = sections.get(pkgName);
      if (!sec) continue;
      if (!sec.has(categoryHeader)) sec.set(categoryHeader, []);
      sec.get(categoryHeader).push(bullet);
    }
  }

  const orderedHeaders = CATEGORIES.map((c) => c.header);
  const outputParts = [];
  for (const pkg of PACKAGES) {
    const pkgSection = sections.get(pkg.name);
    if (!pkgSection || pkgSection.size === 0) continue;
    const lines = [`## ${pkg.label}`, ''];
    for (const header of orderedHeaders) {
      const bullets = pkgSection.get(header);
      if (bullets?.length) lines.push(`### ${header}`, ...bullets, '');
    }
    outputParts.push(lines.join('\n'));
  }

  process.stdout.write(outputParts.length ? outputParts.join('\n---\n\n') : '_No categorised changes since last release._\n');
  process.exit(0);
}

const prevTagDate = prevTag ? getTagDate(prevTag) : null;

console.error(`Fetching merged PRs from ${repo} since ${prevTagDate ?? 'beginning'}...`);

const prs = await fetchMergedPRs(repo, token, prevTagDate);

if (prs.length === 0) {
  process.stdout.write('_No changes since last release._\n');
  process.exit(0);
}

console.error(`Found ${prs.length} merged PRs.`);

// Structure: packageName → categoryHeader → bullet[]
/** @type {Map<string, Map<string, string[]>>} */
const sections = new Map(PACKAGES.map((p) => [p.name, new Map()]));

for (const pr of prs) {
  const title = pr.title?.trim() ?? '';
  const login = pr.user?.login ?? null;
  const prNumber = pr.number ?? null;
  const effectiveLogin = login && !BOT_PATTERN.test(login) ? login : null;

  const match = CC_RE.exec(title);
  let scope, breaking, description, categoryKey;

  if (match) {
    const type = match[1];
    scope = match[3] ?? null;
    breaking = Boolean(match[4]);
    description = match[5];
    categoryKey = resolveCategory(type, scope);
  } else {
    scope = null;
    breaking = false;
    description = title;
    categoryKey = '__other__';
  }

  let categoryHeader = categoryKey;
  if (categoryKey === '__other__') categoryHeader = '🔀 Other';
  else if (categoryKey === '__deps__') categoryHeader = '📦 Dependencies';

  const bullet = formatBullet(description, breaking, effectiveLogin, prNumber, repo);

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
