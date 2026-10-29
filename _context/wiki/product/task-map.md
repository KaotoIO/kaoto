---
title: Task-to-code map
type: reference
version: 1.0
tags: [development, entry-points, architecture, tasks]
---

# Task-to-code map

A compact guide for AI agents: common tasks, the files to read first, the files most likely to change, reference tests, and the focused validation command to run during iteration.

> **Token tip**: read only the entry-point files listed here. Widen your investigation only when a test fails or a type error points elsewhere.

---

## Canvas / visualization changes

Changes to how routes, nodes, groups, edges, or placeholders are rendered or behave on the visual canvas.

| What | Where |
|------|-------|
| **Entry point — node rendering** | `packages/ui/src/components/Visualization/Custom/` |
| **Entry point — canvas layout** | `packages/ui/src/components/Visualization/Canvas/` |
| **Node model (IVisualizationNode)** | `packages/ui/src/models/visualization/visualization-node.ts` |
| **Node-to-canvas model bridge** | `packages/ui/src/components/Visualization/designer-canvas-model.ts` |
| **Flow-to-node mapping (Camel)** | `packages/ui/src/models/visualization/flows/abstract-camel-visual-entity.ts` |
| **Flow-to-node mapping (per DSL)** | `packages/ui/src/models/visualization/flows/camel-route-visual-entity.ts` and sibling files |
| **Topology shell** | `packages/ui/src/components/Visualization/DesignerVisualization.tsx` |
| **Reference tests** | `packages/ui/src/models/visualization/visualization-node.test.ts`, `packages/ui/src/components/Visualization/DesignerVisualization.test.tsx` |
| **Focused validation** | `yarn workspace @kaoto/kaoto test src/components/Visualization` |

**Key invariant**: `IVisualizationNode` forms a doubly-linked list (`previousNode`/`nextNode`) for sequential flow **and** a tree (`parentNode`/`children`) for nesting. Never set these pointers directly — use the methods on the node. The canvas model is derived from these relationships; changes to node structure are reflected automatically.

---

## YAML / DSL parsing and serialisation

Changes to how Camel YAML DSL files are read from disk, parsed into the internal model, and written back.

| What | Where |
|------|-------|
| **Entry point — resource loading** | `packages/ui/src/providers/kaoto-resource.provider.tsx` |
| **Camel YAML parser** | `packages/ui/src/models/camel/` |
| **Visual entity constructors** | `packages/ui/src/models/visualization/flows/` (one file per DSL entity type) |
| **Definition normaliser** | `packages/ui/src/models/visualization/flows/definition-normalizer.ts` |
| **Entities provider (holds all loaded flows)** | `packages/ui/src/providers/entities.provider.tsx` |
| **YAML ↔ model roundtrip tests** | `packages/ui/src/models/visualization/flows/camel-route-visual-entity.test.ts` and sibling `*.test.ts` files |
| **Focused validation** | `yarn workspace @kaoto/kaoto test src/models/visualization/flows` |

**Key invariant**: Every edit on the canvas must be serialisable back to valid Camel YAML DSL without data loss. The `toYaml()` / serialisation path on each `*VisualEntity` class is the contract — keep it in sync with any structural change.

---

## DataMapper changes

Changes to the visual field-mapping editor (source/target schema mapping, transformation expressions).

| What | Where |
|------|-------|
| **Entry point — UI** | `packages/ui/src/components/DataMapper/` |
| **DataMapper provider (state)** | `packages/ui/src/providers/datamapper.provider.tsx` |
| **Data model** | `packages/ui/src/models/datamapper/` |
| **DnD provider** | `packages/ui/src/providers/datamapper-dnd.provider.tsx` |
| **Mapping links provider** | `packages/ui/src/providers/data-mapping-links.provider.tsx` |
| **Reference tests** | `packages/ui/src/providers/datamapper.provider.test.tsx`, `packages/ui/src/providers/datamapper-dnd.provider.test.tsx` |
| **Focused validation** | `yarn workspace @kaoto/kaoto test src/components/DataMapper` |

---

## Public API / library surface changes

Changes to what `@kaoto/kaoto` exports to consumers such as the VS Code extension.

| What | Where |
|------|-------|
| **Primary public API** | `packages/ui/src/public-api.ts` |
| **Components-only API** | `packages/ui/src/components-api.ts` |
| **Models API** | `packages/ui/src/models-api.ts` |
| **Testing API** | `packages/ui/src/testing-api.ts` |
| **Multiplying-architecture bridge (VS Code IPC)** | `packages/ui/src/multiplying-architecture/` |
| **VS Code extension integration** | `packages/kaoto-vscode/` — see `packages/kaoto-vscode/AGENTS.md` |

**Key invariant**: Removing or renaming anything exported from `public-api.ts` / `models-api.ts` is a **breaking change** for the VS Code extension. Confirm with the team before removing exports. Adding new exports is safe.

---

## Camel catalog / component palette changes

Changes to the component catalog sidebar, property forms, or schema resolution.

| What | Where |
|------|-------|
| **Entry point — catalog UI** | `packages/ui/src/components/Catalog/` |
| **Catalog provider** | `packages/ui/src/providers/` (see `catalog-loading.test.tsx` for context) |
| **Dynamic catalog (runtime schema resolution)** | `packages/ui/src/dynamic-catalog/` |
| **Generated catalog assets** | `lib/` directory — **never hand-edit**, regenerate with project tooling |
| **Focused validation** | `yarn workspace @kaoto/kaoto test src/components/Catalog` |

---

## Settings changes

Changes to user-configurable settings (node label style, appearance preferences, runtime options).

| What | Where |
|------|-------|
| **Settings model** | `packages/ui/src/models/settings/` |
| **Settings provider** | `packages/ui/src/providers/settings.provider.tsx` |
| **Settings UI** | `packages/ui/src/components/Settings/` |
| **Reference test** | `packages/ui/src/providers/settings.provider.test.tsx` |
| **Focused validation** | `yarn workspace @kaoto/kaoto test src/providers/settings` |

---

## Validation quick-reference

| When | Command |
|------|---------|
| **During development** (one area) | `yarn workspace @kaoto/kaoto test src/path/to/area` |
| **Before committing** (full required) | `yarn workspace @kaoto/kaoto build && yarn workspace @kaoto/kaoto test && yarn workspace @kaoto/kaoto lint:fix && yarn workspace @kaoto/kaoto lint:style:fix` |
| **Commit message** | `yarn commitlint --from HEAD~1 --to HEAD` |
