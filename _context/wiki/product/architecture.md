---
title: Architectural constraints
type: reference
version: 1.0
tags: [architecture, design, constraints, invariants]
---

# Architectural constraints

Non-obvious design decisions, state ownership rules, key invariants, and public interface boundaries. Read this before making structural changes to avoid mistakes that are hard to detect until CI fails.

---

## State ownership

Understanding which layer owns what state prevents accidental duplication or bypassing of the source of truth.

| State                           | Owner                                                             | Notes                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loaded Camel YAML content (raw) | `KaotoResourceProvider` (`providers/kaoto-resource.provider.tsx`) | Single source of truth for the file on disk. All other state is derived from this.                                                                                       |
| Parsed flows / visual entities  | `EntitiesProvider` (`providers/entities.provider.tsx`)            | Derives its list of `BaseVisualEntity` objects from `KaotoResourceProvider`. Mutating a visual entity must always trigger a re-serialisation back through this provider. |
| Which flows are shown           | `VisibleFlowsProvider` (`providers/visible-flows.provider.tsx`)   | Controls the `visibleFlows` set. Does **not** own flow data — only visibility.                                                                                           |
| Component catalog / schemas     | `SchemasProvider` (`providers/schemas.provider.tsx`)              | Loads and caches JSON schemas from the generated Camel catalog. Never duplicated in component state.                                                                     |
| Settings                        | `SettingsProvider` (`providers/settings.provider.tsx`)            | User preferences (label style, appearance). Persisted via localStorage.                                                                                                  |
| DataMapper mapping state        | `DataMapperProvider` (`providers/datamapper.provider.tsx`)        | Owns the source/target schema trees and the mapping definition. Separate from route-flow state.                                                                          |
| Drag-and-drop within DataMapper | `DataMapperDndProvider` (`providers/datamapper-dnd.provider.tsx`) | Transient drag state only — does not own mapping data.                                                                                                                   |

**Rule**: Always read and write through the owning provider. Never reach into a sibling provider's state directly from a component.

---

## Key invariants

These constraints must be preserved across all changes or the application will silently produce incorrect output.

### 1. YAML roundtrip fidelity

Every canvas edit is immediately serialised back to the active source DSL. The serialisation path (`toYaml()` / `updateModel()` on each `*VisualEntity`) is the contract between the visual model and the file on disk.

**Invariant**: Any structural change to a `*VisualEntity` class must keep the serialisation path in sync. A canvas edit that cannot roundtrip to valid YAML is a regression.

**How to test**: The `*.test.ts` files in `packages/ui/src/models/visualization/flows/` use snapshot tests for serialisation output. Run them after any flow-model change.

### 2. IVisualizationNode doubly-linked list + tree

`IVisualizationNode` represents a canvas node. Nodes are connected in two overlapping structures simultaneously:

- **Doubly-linked list**: `previousNode` / `nextNode` represent sequential execution order within a branch.
- **Tree**: `parentNode` / `children[]` represent nesting (groups).

**Invariant**: Never set `previousNode`, `nextNode`, `parentNode`, or `children` directly from outside the node class. Use the builder/factory methods. The canvas model (`designer-canvas-model.ts`) derives edges and groups from these relationships automatically — an inconsistent pointer state produces incorrect canvas rendering with no error thrown.

### 3. DSL-agnostic generic layer

`IVisualizationNode` and `CanvasNode` must remain DSL-agnostic. Camel-specific logic belongs in:

- `AbstractCamelVisualEntity` and its subclasses (flow-level)
- `CamelProcessorStepsProperties` and the node-mapper utilities (node-level)

**Invariant**: Do not import Camel-specific types (`CatalogKind.Processor`, `ProcessorDefinition`, etc.) into files that are part of the generic visualization layer. Check existing imports in the file you are editing.

### 4. Generated catalog files are read-only

The Camel component catalog (everything under `lib/` and generated catalog assets) is generated by OpenJDK tooling from the upstream Camel runtime. **Never hand-edit these files.** Any hand-edit will be overwritten the next time the catalog is regenerated and will introduce hard-to-diagnose type drift.

### 5. Public API is a breaking-change boundary

Anything exported from `packages/ui/src/public-api.ts` and `packages/ui/src/models-api.ts` is consumed by the VS Code extension (`vscode-kaoto`) and potentially other downstream consumers.

**Invariant**: Removing or renaming a public export is a breaking change that requires coordination with the VS Code extension team. Adding new exports is always safe.

---

## Public interface boundaries

| Boundary            | File                                                                 | Consumed by                                                                               |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Full public API     | `packages/ui/src/public-api.ts`                                      | VS Code extension, external embedders                                                     |
| Components-only API | `packages/ui/src/components-api.ts`                                  | `RouteVisualization` standalone component users                                           |
| Models API          | `packages/ui/src/models-api.ts`                                      | Downstream TypeScript consumers needing type definitions                                  |
| Testing API         | `packages/ui/src/testing-api.ts`                                     | Test helpers shared with `packages/ui-tests/`                                             |
| VS Code IPC bridge  | `packages/ui/src/host-bridge/` and `packages/ui/src/webview/editor/` | VS Code extension — uses the native host bridge (`IEventBus`) for bidirectional messaging |

The VS Code webview editor (`KaotoEditor` in `packages/ui/src/webview/editor/`) communicates with the extension host via the host bridge (`packages/ui/src/host-bridge/`). The bridge uses `IEventBus` with transport obtained through `window.__kaotoHost` (backed by `acquireVsCodeApi().postMessage()` in the webview host shim and `webview.postMessage()` on the extension side); there is no Kogito / KIE channel API dependency. Changes to this layer require corresponding changes in `packages/kaoto-vscode/`.

---

## Non-obvious design decisions

### Why the doubly-linked list + tree?

Sequential execution order (list) and structural nesting (tree) are two independent concerns in Camel routes. A `choice` node has children (`when`, `otherwise`) in the tree, but within each branch the steps form their own linked list. Keeping them separate allows the canvas layout engine (`@patternfly/react-topology`) to handle both independently.

### Why separate DSL-specific visual entity classes?

Each DSL (Camel Route, Kamelet, Pipe, Citrus) has different serialisation rules, allowed node types, and canvas layout constraints. Sharing a single class would require deep conditional branching. Instead, each DSL has its own `*VisualEntity` class extending `AbstractCamelVisualEntity` (for Camel-family DSLs) or `BaseVisualEntity` (for others). The factory pattern in `EntitiesProvider` selects the correct class at load time.

### Why a `DefinitionNormalizer`?

Camel YAML DSL has many optional fields, legacy aliases, and URI shorthand forms. The normaliser (`definition-normalizer.ts`) canonicalises raw YAML objects into the internal model before they are passed to visual entities. This keeps individual entity classes free from raw-YAML-handling quirks.

### Placeholders as first-class nodes

Placeholder nodes (`isPlaceholder: true`) are regular `IVisualizationNode` instances in the tree, not a separate UI concept. This lets the same canvas interaction code (click to insert, drag-and-drop) work uniformly for both real nodes and insertion points. A placeholder is replaced by a real node when the user selects a component from the catalog.

### SVG `foreignObject` rendering in Safari

The canvas combines SVG positioning and scaling with HTML content embedded through `foreignObject`. Changes to the embedded HTML's CSS can affect how Safari renders that content within the surrounding SVG transforms. Consider this boundary whenever changing embedded content, stacking, positioning, or visual decorations, not only keyboard focus styles.

**Observed failure:** While addressing overlapping focus outlines in [#4310](https://github.com/KaotoIO/kaoto/issues/4310), raising HTML corner badges with `z-index` caused a macOS Safari regression: badges appeared at the canvas origin instead of following the node position and scale. This is a concrete failure in this canvas implementation, not a blanket prohibition of `z-index` inside `foreignObject`. Do not assume other CSS properties cause the same failure without reproducing it.

**Implementation guidance:** Review both SVG paint order and HTML stacking when changing overlapping elements. For purely graphical decorations, consider rendering them directly in SVG so their positioning and scaling stay in the SVG coordinate system. Preserve the relevant node and drag-preview transforms; decorative elements should not intercept pointer events.

**Example:** [PR #4311](https://github.com/KaotoIO/kaoto/pull/4311) implements the focus ring as an SVG `rect` painted before the node's `foreignObject`, keeping it behind the HTML badges without raising their stacking order. The ring is hidden until the node has focus and uses `pointer-events: none`. See `CustomNode.tsx` and `CustomNode.scss` under `packages/ui/src/components/Visualization/Custom/Node/` in that PR for the implementation; the PR was still open when this note was added.

**Browser validation for changes at this boundary:**

- Check that embedded content remains positioned and scaled with its node during zoom, pan, and drag previews, in horizontal and vertical layouts.
- Check overlapping content and decorations, including different badge types and keyboard focus states, for visibility and correct paint order.
- Validate in Chromium and macOS Safari. DOM tests cannot establish visual paint order or browser compositing behavior. WebKit fixtures help isolate regressions, but do not replace testing the full application in macOS Safari. For #4311, the regression was reproduced and the SVG approach checked in a Linux WebKit fixture.
