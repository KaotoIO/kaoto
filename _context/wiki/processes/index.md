---
title: Team processes
type: process-guide
version: 1.0
last_updated: 2025-01-01
tags: [processes, workflows, ceremonies]
---

# Team processes

## How we work

The team follows a **kanban / continuous-flow** model, working through issues until the target set for each release plan is met. There are no fixed sprint lengths — work is pulled continuously and releases are cut when the planned scope is complete.

## Key ceremonies

**Weekly sync**: Combined planning and triage call — covers new issues, feature requests, and ongoing work. The primary forum for decisions and reprioritisation.

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

Decisions are made through a layered approach:
- **Day-to-day**: Slack discussion in `#team-kaoto-roughnecks`
- **Triage and priorities**: Weekly sync call
- **Larger changes**: Planning calls as needed, supplemented by Slack and GitHub Issue/PR discussion
