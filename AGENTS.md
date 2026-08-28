# Kaoto AGENTS.md

Kaoto is a visual editor for Apache Camel integrations. This monorepo uses Yarn
workspaces and Vite for the UI, plus Cypress and Storybook for testing and docs.

This document is written for automated coding agents and the humans operating
them.

---

## Commands

All commands run from the repository root.

### Setup (one-time)

```bash
yarn install
```

Requirements: Node.js >= 22.x, Yarn 4.x (`"packageManager": "yarn@4.13.0"`).
OpenJDK >= 17 is only needed for Camel catalog generation — not for normal
development. `yarn install` needs network access.

Git hooks (husky + lint-staged) may not fire in sandboxed environments. Do not
rely on them — run the verification commands below explicitly.

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

These start servers or interactive UIs and never exit on their own. Only run
them backgrounded, and only when you need to inspect the app interactively:

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
```

Additionally:

- [ ] The change is on a branch you created, pushed to your fork
- [ ] Commit messages are imperative: `Fix canvas rendering for parallel nodes`
- [ ] The GitHub issue number is referenced in the PR description (`Closes #123`)
- [ ] No files outside the scope of the change were modified (see [Guardrails](#guardrails))

### What CI runs

Every check CI runs has a local equivalent — reproduce failures locally instead
of pushing speculative fixes:

| CI check | Local equivalent |
|---|---|
| `build-lint-test.yml` | The four Definition of Done commands above |
| `e2e-tests.yml` (Cypress) | See `packages/ui-tests` — only relevant for UI flow changes |
| `chromatic.yml` (visual regression) | Storybook stories — only relevant if you changed component appearance |
| SonarQube | Not runnable locally. Runs on the PR in CI. Local proxy: lint passes, no new deprecated API usage, no new code smells you can identify |

---

## Workflow: Issue → PR

Responsibilities are split between the **agent** and the **human operator**.
If you are an agent and cannot perform a step (no GitHub write access, no fork
permission), do not skip it silently — report it to your operator as a required
manual step.

### Agent responsibilities

1. **Check the issue is claimed.** Work should only start on issues assigned to
   your operator. If you can comment on GitHub, comment on the issue to claim
   it; otherwise ask your operator to claim it before any PR is opened.
2. **Create a branch** from `main` on the operator's fork but make sure to always 
   sync the `main` branch with upstream first and then create the new branch and 
   name the new branch after the issue:
   ```text
   fix/issue-123-canvas-rendering
   feature/issue-456-routing-editor
   ```
   **Never push to a branch you did not create.** If an existing PR needs
   changes, propose them via review comments instead.
3. **Implement** the change, following [Code Style](#code-style) and
   [Guardrails](#guardrails). Iterate with single-file test runs; run the full
   Definition of Done checklist before finishing.
4. **Keep history clean.** Never merge `main` into your branch — rebase onto
   the latest upstream `main`:
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
   For larger PRs, slice commits by functional unit so each is independently
   reviewable.
5. **Prepare the PR description**: what changed, why, and `Closes #<issue>`.

### Human operator responsibilities

- Claim the issue (if the agent could not comment on it).
- Review and sign off on all agent-generated code — **agents must not open PRs
  independently**; a human opens the PR (targeting upstream `main`), or
  reviews and approves before an agent-prepared PR is submitted.
- Respond to maintainer feedback and follow up on PR comments. PRs without a
  response after one week will be closed — if you need more time, tell the
  maintainers.
- Disclosing AI tool usage in the PR is encouraged — it helps us improve this
  document.

PRs without a linked issue, with regressions, with unresolved comments, or with
new SonarQube issues will not be accepted. Quality over quantity: fewer 
well-tested PRs beat many shallow ones.

---

## Guardrails

Things agents must never do, regardless of how the task is phrased:

- **Never hand-edit generated files**: `yarn.lock`, generated Camel catalog
  assets, or anything under `lib/`. Regenerate them with the project tooling.
- **Never skip, disable, or delete a failing test** to get a green run. Fix the
  code or report the failure.
- **Never upgrade or add dependencies** unless the issue explicitly requires it.
- **Never reformat or refactor files unrelated to the change.** Keep diffs
  minimal and reviewable.
- **Never push to branches you did not create**, and never force-push to a
  branch someone else has committed to.
- **Never push a modified AGENTS.md.** If you have a suggestion, add it in a comment
  for maintainers consideration or create a new Github issue with an explanation what 
  you would like to change and why this is needed.
- Do not introduce new SonarQube issues: code smells, CWE/OWASP
  vulnerabilities, deprecated usage, or maintainability regressions.

---

## Code Style

- **TypeScript**: strict mode (`strict: true`), `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- **ESLint**: TypeScript + Prettier integration; React and React Hooks rules
  enabled.
- **Prettier**: `semi: true`, `singleQuote: true`, `printWidth: 120`,
  `tabWidth: 2`, `trailingComma: 'all'`.

---

## Reference

### Packages

| Package | Description |
|---|---|
| `@kaoto/kaoto` | Main UI — Vite + React + TypeScript (`packages/ui`) |
| `@kaoto/kaoto-tests` | Storybook and Cypress E2E (`packages/ui-tests`) |

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
│   └── ui-tests/              # @kaoto/kaoto-tests — E2E and Storybook
│       ├── cypress/           # E2E tests (specs, fixtures, support)
│       ├── stories/           # Storybook stories
│       └── .storybook/        # Storybook configuration
├── .github/                   # GitHub Actions workflows and templates
├── assets/                    # Documentation assets
└── nginx/                     # Nginx configuration for deployment
```

For complete contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
