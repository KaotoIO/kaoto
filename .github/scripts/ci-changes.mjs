import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Select the existing CI jobs that need to run for a monorepo change.
 *
 * The `changes` job in build-lint-test.yml runs this script before any package builds.
 * This script only selects jobs; the workflows still own their build, lint and test commands.
 * Keep existing package validation intact when adjusting these rules. Package isolation and
 * the standard/deployment split follow the current expectations in KaotoIO/kaoto#3852.
 */

/**
 * Map repository-relative Git paths to the output names declared by build-lint-test.yml.
 *
 * `ui` includes validation of both the UI and UI-tests sources.
 * `vscode-smoke` runs only the settings and editor integration groups (triggered by UI changes,
 * where only the embedded UI library is affected). `vscode-full` runs all four groups and is
 * triggered by extension changes or the conservative all-jobs fallback. `deploy` adds Minikube
 * tests on top of `vscode-full`. `web`, `e2e` and `chromatic` select the web package, Cypress
 * and Storybook respectively.
 *
 * @param {string[] | null} files Changed paths, including deletions. null means the diff is
 *   unknown and all jobs must run; [] means a known empty diff and selects no package jobs.
 * @param {string} eventName GitHub event name; defaults to PR behavior for direct callers.
 * @returns {Record<string, boolean>} Union of the jobs required by every changed path.
 */
export function selectJobs(files, eventName = 'pull_request') {
  const jobs = { ui: false, web: false, 'vscode-smoke': false, 'vscode-full': false, deploy: false, e2e: false, chromatic: false };
  const all = () => Object.fromEntries(Object.keys(jobs).map((key) => [key, true]));
  if (files === null) return all();

  // Preserve Chromatic's previous PR paths-ignore rule: skip only when EVERY changed
  // file is inside cypress/. It never excluded cypress.config.ts or Cypress-only pushes.
  const skipChromatic =
    eventName === 'pull_request' && files.every((file) => file.startsWith('packages/ui-tests/cypress/'));

  // Accumulate requirements across the whole diff. For example, UI + extension changes
  // must include deployment tests even though a UI-only change does not need them.
  for (const file of files) {
    if (file.startsWith('packages/ui/')) {
      // The extension embeds the UI library. Validate the embedded UI with a reduced set of
      // integration groups (settings + editor only) without starting a deployment cluster.
      Object.assign(jobs, { ui: true, 'vscode-smoke': true, e2e: true, chromatic: true });
    } else if (file.startsWith('packages/kaoto-vscode/')) {
      // Extension changes exercise all four integration groups and deployment tests.
      // The build job still builds the prerequisite UI library; it does not run UI checks.
      Object.assign(jobs, { 'vscode-full': true, deploy: true });
    } else if (file.startsWith('packages/kaoto-web/')) {
      // The current web package has its own validation and does not consume the UI library.
      jobs.web = true;
    } else if (file.startsWith('packages/ui-tests/')) {
      // Preserve this package's existing checks instead of narrowing them by test folder:
      // Cypress also ran on story/config changes, and Chromatic only had the PR exception above.
      jobs.ui = true;
      jobs.e2e = true;
      jobs.chromatic ||= !skipChromatic;
    } else if (
      !file.startsWith('docs/') &&
      !file.startsWith('assets/readme/') &&
      !file.startsWith('.github/ISSUE_TEMPLATE/') &&
      !file.startsWith('.github/PULL_REQUEST_TEMPLATE/') &&
      !file.startsWith('.vscode/') &&
      !/^[^/]+\.md$/.test(file)
    ) {
      // Only known documentation/template paths outside packages can avoid package checks.
      // Everything else (lockfile, lint config, Yarn release, CI files, unknown packages)
      // selects all current jobs so a new shared input cannot silently lose validation.
      return all();
    }
  }
  return jobs;
}

// Importing selectJobs in unit tests must not read Actions files or invoke Git.
// This block runs only when Node executes ci-changes.mjs as the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pullRequest = event.pull_request;
  // Use the event's PR head rather than the synthetic merge commit checked out by Actions.
  // For pushes, before/after cover every commit in the push, not just the last commit.
  const base = pullRequest?.base.sha ?? event.before;
  const head = pullRequest?.head.sha ?? event.after;
  // Manual dispatch has no comparison pair; the first push has an all-zero before SHA.
  // Leave files unknown in both cases so selectJobs conservatively selects everything.
  let files = null;
  if (base && head && !/^0+$/.test(base)) {
    try {
      // PR three-dot diff: changes since the merge base, excluding unrelated base-branch work.
      // Push two-dot diff: difference between the before and after trees.
      // --no-renames reports a move as deletion + addition, selecting both affected packages.
      // -z separates paths with NUL bytes so spaces, tabs and newlines in names remain intact.
      files = execFileSync(
        'git',
        ['diff', '--name-only', '--no-renames', '-z', `${base}${pullRequest ? '...' : '..'}${head}`, '--'],
        {
          encoding: 'utf8',
        },
      )
        .split('\0')
        .filter(Boolean);
    } catch {
      // Missing history or an unavailable commit must not make required validation disappear.
      console.warn('Unable to compare commits; running all CI jobs.');
    }
  }
  const jobs = selectJobs(files, process.env.GITHUB_EVENT_NAME);
  // Actions step outputs are strings. The workflow compares these values with 'true' when
  // selecting jobs. Even when all are false, its aggregate `build` check still completes.
  const output = Object.entries(jobs)
    .map(([name, value]) => `${name}=${value}`)
    .join('\n');
  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
  // Also show the selection in the job log for troubleshooting unexpected runs or skips.
  console.log(output);
}
