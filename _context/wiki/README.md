# Wiki README

This file defines the rules for editing and syncing the Kaoto context wiki.

## Editing guidelines

- **Only edit wiki files when explicitly instructed** by the user — do not speculatively update them during regular tasks.
- Edit the most specific file for the topic (e.g. team changes → `team/index.md`, not `index.md`).
- Keep entries concise — this wiki is context for AI assistants, not full documentation.
- Prefer merging new information into existing sections over adding new top-level sections.
- Do not remove existing content without being asked to.

## Sync workflow

When the user asks to "sync the wiki":

1. Ask the user what has changed (team, product, processes, tools, or glossary).
2. Read the relevant section file(s) before editing.
3. Draft the updated content and show it to the user.
4. Write the file only after the user approves.

## Wiki structure

```
_context/wiki/
├── README.md          ← this file
├── index.md           ← top-level navigation hub
├── team/
│   └── index.md       ← team mission, contacts, AI contributor policy
├── product/
│   ├── index.md       ← what we build, users, features, strategy, non-goals
│   ├── task-map.md    ← task-to-code map: entry points, tests, validation
│   └── architecture.md ← state ownership, invariants, public interfaces
├── processes/
│   └── index.md       ← how we work, workflows, decisions, issue quality
├── tools/
│   └── index.md       ← dev tools, collaboration tools, integrations
└── glossary.md        ← terms, acronyms, domain concepts
```
