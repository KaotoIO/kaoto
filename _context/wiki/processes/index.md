---
title: Team processes
type: process-guide
version: 1.0
tags: [processes, workflows, ceremonies]
---

# Team processes

## How we work

The team follows a **kanban / continuous-flow** model, working through issues until the target set for each release plan is met. There are no fixed sprint lengths — work is pulled continuously and releases are cut when the planned scope is complete.

## Workflows

### Feature development

All work is tracked via GitHub Issues. For the full step-by-step agent and human-operator responsibilities, see [Workflow: Issue → PR](../../../AGENTS.md#workflow-issue--pr) in `AGENTS.md`.

Summary:
1. Issue opened and assigned on `KaotoIO/kaoto`
2. Branch created from synced `main`: `feature/issue-NNN-description` or `fix/issue-NNN-description`
3. Implementation, then full validation (`build`, `test`, `lint:fix`, `lint:style:fix`)
4. PR opened targeting upstream `main` with `Closes #NNN`
5. Human reviews and approves; maintainer merges after CI passes

### Bug handling

1. Bug is reported as a GitHub Issue with the `bug` label
2. Triaged in the weekly sync — priority and assignee confirmed
3. Fix follows the same feature development flow above

## Decision making

- **Day-to-day**: Discussion on GitHub Issues and PRs
- **Larger changes**: Coordinated through GitHub Issues before implementation begins — open an issue and discuss with maintainers before starting significant work

---

## What makes an issue AI-actionable

An issue is ready for an agent to work on when it contains all of the following:

1. **Problem statement**: What is broken or missing, and why it matters.
2. **Reproducible example**: Steps to reproduce (for bugs) or a concrete use-case scenario (for features). Include sample YAML files or screenshots where relevant.
3. **Expected behaviour**: What the correct outcome looks like.
4. **Acceptance criteria**: A short checklist of conditions that a PR must satisfy for the issue to be closed. Be explicit — vague criteria ("works correctly") are not actionable.
5. **Scope boundary**: What is explicitly *out of scope* for this issue. Prevents over-engineering.
6. **Known entry points** (optional but high-value): File paths or component names where the change is likely to start. See [task-to-code map](../product/task-map.md) for common areas.

Issues that describe only symptoms without acceptance criteria or scope boundaries will be flagged for clarification before an agent starts work.
