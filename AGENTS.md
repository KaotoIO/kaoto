# Agent Rules Standard (AGENTS.md)

## Start with the wiki

At the start of each task, decide whether wiki context is needed. If needed, check `_context/wiki/index.md` and follow relevant links. Don't read the wiki in full.

**Check wiki for:** domain concepts, artifacts following patterns, team processes/governance, cross-functional knowledge, strategic planning

**Skip wiki for:** simple file operations, isolated code fixes, administrative tasks, or when request contains full context

## Wiki editing and syncing

**Editing:** Only edit wiki when explicitly instructed. See `_context/wiki/README.md` for editing guidelines.

**Syncing:** When user asks to sync the wiki, see `_context/wiki/README.md` for sync workflow.

## Critical workspace rules

- **Never hand-edit generated files**: `yarn.lock`, generated Camel catalog assets, or anything under `lib/`. Regenerate them with the project tooling.
- **Never skip, disable, or delete a failing test** to get a green run. Fix the code or report the failure.
- **Never upgrade or add dependencies** unless the issue explicitly requires it.
- **Never reformat or refactor files unrelated to the change.** Keep diffs minimal and reviewable.
- **Never push to branches you did not create**, and never force-push to a branch someone else has committed to.
- **Never push a modified AGENTS.md.** If you have a suggestion, add it in a comment for maintainers consideration or create a new Github issue with an explanation what you would like to change and why this is needed.
- Do not introduce new SonarQube issues: code smells, CWE/OWASP vulnerabilities, deprecated usage, or maintainability regressions.

## General guidelines

- **TypeScript**: strict mode — see [`tsconfig.base.json`](tsconfig.base.json) for the authoritative flags. Key settings: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- **ESLint**: TypeScript + Prettier integration — see [`eslint.config.mjs`](eslint.config.mjs). React and React Hooks rules are enabled.
- **Prettier**: see [`.prettierrc`](.prettierrc) for the authoritative config. Key settings: `semi: true`, `singleQuote: true`, `printWidth: 120`, `tabWidth: 2`, `trailingComma: 'all'`.
- **Style lint**: see [`.stylelintrc`](.stylelintrc) for CSS/SCSS rules.

---

## Commands

All commands run from the repository root.

### Setup (one-time)

```bash
yarn install
```

Requirements: Node.js >= 22.x, Yarn 4.x — exact version pinned in `package.json` under `"packageManager"`.
OpenJDK >= 17 is only needed for Camel catalog generation — not for normal development. `yarn install` needs network access.

Git hooks (husky + lint-staged) may not fire in sandboxed environments. Do not rely on them — run the verification commands below explicitly.

### Everyday commands

| Task | Command |
|---|---|
| Unit tests (full suite, slow) | `yarn workspace @kaoto/kaoto test` |
| Unit tests (single file — prefer while iterating) | `yarn workspace @kaoto/kaoto test src/path/to/file.test.ts` |
| Typecheck + build | `yarn workspace @kaoto/kaoto build` |
| Lint code (fix) | `yarn workspace @kaoto/kaoto lint:fix` |
| Lint styles (fix) | `yarn workspace @kaoto/kaoto lint:style:fix` |
| Lint tests/stories (fix) | `yarn workspace @kaoto/kaoto-tests lint:fix` |
| Build library | `yarn workspace @kaoto/kaoto build:lib` |

### Long-running commands — do not run in the foreground

These start servers or interactive UIs and never exit on their own. Only run them backgrounded, and only when you need to inspect the app interactively:

| Task | Command |
|---|---|
| Dev server (→ http://localhost:5173) | `yarn workspace @kaoto/kaoto start` |
| Static preview | `yarn workspace @kaoto/kaoto preview` |
| Storybook | `yarn workspace @kaoto/kaoto-tests storybook` |

For non-interactive verification, use build + unit tests instead.

---

## Definition of Done

Before declaring a task complete, verify ALL of the following pass:

```bash
yarn workspace @kaoto/kaoto build            # typecheck — tests and lint do NOT run tsc
yarn workspace @kaoto/kaoto test
yarn workspace @kaoto/kaoto lint:fix
yarn workspace @kaoto/kaoto lint:style:fix
yarn commitlint --from HEAD~1 --to HEAD      # validate the last commit message; adjust range for multiple commits
```

Additionally:

- [ ] The change is on a branch you created, pushed to your fork
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
      `feat(ui): add canvas rendering for parallel nodes`, `fix(ui): correct routing edge overlap`, `chore: update deps`
      Valid types: `build` `chore` `ci` `docs` `e2e` `feat` `fix` `perf` `refactor` `revert` `style` `test`
      (enforced locally by Husky + commitlint; validated in CI)
- [ ] The GitHub issue number is referenced in the PR description (`Closes #123`)
- [ ] No files outside the scope of the change were modified (see [Critical workspace rules](#critical-workspace-rules))

### What CI runs on a PR

`build-lint-test.yml` is the primary PR workflow. It runs a `changes` job first to select only the jobs relevant to the files you modified — not all jobs run on every PR.

| Job (inside `build-lint-test.yml`) | Triggers when | Local equivalent |
|---|---|---|
| `commitlint` | All PRs | `yarn commitlint --from $(git merge-base HEAD main) --to HEAD` |
| `ui` | `packages/ui/` or `packages/ui-tests/` changed | `yarn workspace @kaoto/kaoto lint && yarn workspace @kaoto/kaoto lint:style && yarn workspace @kaoto/kaoto-tests lint && yarn workspace @kaoto/kaoto build && yarn workspace @kaoto/kaoto build:lib && yarn workspace @kaoto/kaoto test` |
| `web` | `packages/kaoto-web/` changed | `yarn workspace @kaoto/kaoto-web lint && yarn workspace @kaoto/kaoto-web build && yarn workspace @kaoto/kaoto-web test` |
| `vscode-smoke` | `packages/ui/` changed (reduced VS Code checks) | See [`packages/kaoto-vscode/AGENTS.md`](packages/kaoto-vscode/AGENTS.md) |
| `vscode-full` | `packages/kaoto-vscode/` or `packages/ui-tests-vscode/` changed (all VS Code checks) | See [`packages/kaoto-vscode/AGENTS.md`](packages/kaoto-vscode/AGENTS.md) |
| `e2e` (Cypress) | `packages/ui/` or `packages/ui-tests/` changed | Run locally via `packages/ui-tests` |
| `chromatic` (visual regression) | UI/story changes, non-draft PRs targeting `main` | Storybook stories |

**Not on PRs** (no local equivalent needed):

| Workflow | When |
|---|---|
| `deploy-main.yml` | Push to `main` or manual dispatch — deploys the app |
| `nightly.yml` | Daily cron — full test matrix |
| `release-pipeline.yml` / `release-vscode.yml` | Manual — release tagging and publishing |
| `watcher.yml` | Daily cron — closes stale issues/PRs |

---

## Workflow: Issue → PR

Responsibilities are split between the **agent** and the **human operator**.
If you are an agent and cannot perform a step (no GitHub write access, no fork permission), do not skip it silently — report it to your operator as a required manual step.

### Agent responsibilities

1. **Check the issue is claimed.** Work should only start on issues assigned to your operator. If you can comment on GitHub, comment on the issue to claim it; otherwise ask your operator to claim it before any PR is opened.
2. **Create a branch** from `main` on the operator's fork but make sure to always sync the `main` branch with upstream first and then create the new branch and name the new branch after the issue:
   ```text
   fix/issue-123-canvas-rendering
   feature/issue-456-routing-editor
   ```
   **Never push to a branch you did not create.** If an existing PR needs
   changes, propose them via review comments instead.
3. **Implement** the change, following [General guidelines](#general-guidelines) and [Critical workspace rules](#critical-workspace-rules). Iterate with single-file test runs; run the full Definition of Done checklist before finishing.
4. **Keep history clean.** Never merge `main` into your branch — rebase onto the latest upstream `main`:
   ```bash
   git remote add upstream https://github.com/KaotoIO/kaoto.git   # one-time
   git fetch upstream
   git rebase upstream/main
   ```
   Prefer a single squashed commit per PR. If interactive rebase is unavailable
   in your environment, squash non-interactively:
   ```bash
   git reset --soft upstream/main && git commit
   ```
   For larger PRs, slice commits by functional unit so each is independently reviewable.
5. **Prepare the PR description**: what changed, why, and `Closes #<issue>`.

### Human operator responsibilities

- Claim the issue (if the agent could not comment on it).
- Review and sign off on all agent-generated code — **agents must not open PRs independently**; a human opens the PR (targeting upstream `main`), or reviews and approves before an agent-prepared PR is submitted.
- Respond to maintainer feedback and follow up on PR comments. PRs without a response after **one week** will be closed — if you need more time, tell the maintainers.
- Disclosing AI tool usage in the PR is encouraged — it helps us improve this document.

PRs without a linked issue, with regressions, with unresolved comments, or with new SonarQube issues will not be accepted. Quality over quantity: fewer well-tested PRs beat many shallow ones.

---

## Focused validation during development

Run the full Definition of Done checklist **only before completing a task**. During active development, use focused commands to iterate faster:

```bash
# Test a single file (fastest — use this while iterating)
yarn workspace @kaoto/kaoto test src/path/to/file.test.ts

# Test an entire area (e.g., canvas, DataMapper, YAML flows)
yarn workspace @kaoto/kaoto test src/components/Visualization
yarn workspace @kaoto/kaoto test src/models/visualization/flows
yarn workspace @kaoto/kaoto test src/components/DataMapper

# Typecheck only (no test run)
yarn workspace @kaoto/kaoto build
```

For common task areas and their corresponding focused test paths, see the [task-to-code map](_context/wiki/product/task-map.md).

---

## Reference

### Packages

| Package | Description |
|---|---|
| `@kaoto/kaoto` | Main UI — Vite + React + TypeScript (`packages/ui`) |
| `@kaoto/kaoto-tests` | Storybook and Cypress E2E (`packages/ui-tests`) |
| `vscode-kaoto` | VS Code extension — see [`packages/kaoto-vscode/AGENTS.md`](packages/kaoto-vscode/AGENTS.md) |
| `@kaoto/ui-tests-vscode` | ExTester UI tests for the VS Code extension — see [`packages/ui-tests-vscode/README.md`](packages/ui-tests-vscode/README.md) |

### Repository structure

```text
kaoto/
├── packages/
│   ├── ui/                    # @kaoto/kaoto — main application
│   │   └── src/
│   │       ├── components/    # React components (Catalog, DataMapper, Visualization, etc.)
│   │       ├── models/        # Data models (camel, citrus, datamapper, entities)
│   │       ├── camel-utils/   # Camel-specific utilities and parsers
│   │       ├── hooks/         # Custom React hooks
│   │       ├── providers/     # React context providers
│   │       ├── layout/        # Layout components
│   │       ├── pages/         # Page-level components
│   │       ├── assets/        # Static assets including component icons
│   │       └── router/        # React Router configuration
│   ├── ui-tests/              # @kaoto/kaoto-tests — E2E and Storybook
│   │   ├── cypress/           # E2E tests (specs, fixtures, support)
│   │   ├── stories/           # Storybook stories
│   │   └── .storybook/        # Storybook configuration
│   ├── kaoto-vscode/          # VS Code extension (see packages/kaoto-vscode/AGENTS.md)
│   └── ui-tests-vscode/       # @kaoto/ui-tests-vscode — ExTester UI tests for the extension
├── .github/                   # GitHub Actions workflows and templates
├── assets/                    # Documentation assets
└── nginx/                     # Nginx configuration for deployment
```

For complete contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
