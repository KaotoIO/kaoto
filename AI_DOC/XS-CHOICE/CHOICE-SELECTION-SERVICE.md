# ChoiceSelectionService — Implementation Doc

## Overview

`ChoiceSelectionService` is the high-level orchestrator for xs:choice selection operations in the DataMapper. It provides the public API for applying, setting, and clearing choice selections on document fields.

**File:** `packages/ui/src/services/choice-selection.service.ts`
**Tests:** `packages/ui/src/services/choice-selection.service.test.ts`
**Issue:** [#2816 — xs:choice: Apply Saved Selections](https://github.com/KaotoIO/kaoto/issues/2816)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   User / UI Layer                        │
│  (right-click -> "Select Choice Option" — future #2817) │
└──────────────┬───────────────────────────┬───────────────┘
               │ set/clear                 │ apply on load
               v                           v
┌──────────────────────────────────────────────────────────┐
│              ChoiceSelectionService                       │
│  Orchestrator — validates, sorts, warns, delegates       │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
       ┌───────┴────────┐        ┌─────────┴──────────┐
       │ SchemaPathService│       │ DocumentUtilService │
       │ (path <-> field)│       │ (mutate field +     │
       │                  │       │  sync definition)   │
       └───────┬──────────┘       └─────────┬──────────┘
               │                            │
               └────────────┬───────────────┘
                            v
              ┌──────────────────────────┐
              │  IDocument / IField      │
              │  .isChoice               │
              │  .selectedMemberIndex    │
              │  .definition             │
              │    .choiceSelections[]    │
              └──────────────────────────┘
                            │
                            v persisted in
              ┌──────────────────────────┐
              │  .kaoto metadata file    │
              │  (IDocumentMetadata)     │
              └──────────────────────────┘
```

## Design Pattern

Follows the same facade pattern as `FieldTypeOverrideService`:
- Both delegate path operations to `SchemaPathService`
- Both delegate field mutation + definition sync to `DocumentUtilService`
- Both use cascade invalidation via `DocumentUtilService.invalidateDescendants`
- Both are applied together via `DocumentUtilService.processOverrides()` which interleaves them in depth order

## Key Concepts

### Schema Path

A string like `/ns0:Root/{choice:0}` that uniquely identifies a choice field in the document tree.

- Element segments use namespace-prefixed XPath: `ns0:Root`
- Choice segments use `{choice:N}` notation where N is the 0-based index among sibling choices
- The `{choice:N}` syntax is intentionally distinct from XPath to avoid ambiguity with predicates

Examples:
```
/ns0:Root/{choice:0}                              — single choice under Root
/ns0:Root/{choice:0} and /ns0:Root/{choice:1}     — sibling choices
/ns0:Root/{choice:0}/ns0:Option1/{choice:0}       — choice nested via element
/ns0:Root/{choice:0}/{choice:0}                   — choice directly nested in choice
```

Built by `SchemaPathService.build()`, resolved by `SchemaPathService.navigateToChoiceField()`.

### Choice Selection (IChoiceSelection)

```typescript
interface IChoiceSelection extends IBaseOverride {
  schemaPath: string;          // path to the choice field
  selectedMemberIndex: number; // 0-based index of the selected member
}
```

Stored in `DocumentDefinition.choiceSelections[]` for persistence in `.kaoto` metadata.

### Cascade Invalidation

When a parent choice selection changes, all descendant selections (paths starting with `parentPath/`) are removed from the definition. This prevents stale nested selections that may no longer be reachable after the parent changes.

Handled by `DocumentUtilService.invalidateDescendants()`, which also removes stale field type overrides.

## API

### applyChoiceSelections(document, selections, namespaceMap)

**When:** Document initialization / reload from saved metadata.

**What it does:**
1. Sorts selections by path depth (ascending) — parent before child
2. For each selection:
   - Navigates to choice field via schema path
   - Validates member index is in range
   - Warns on invalid paths or indices (console.warn)
   - Delegates to `DocumentUtilService.processChoiceSelection` for valid selections
3. Updates both field state (`selectedMemberIndex`) and definition (`choiceSelections[]`)

**Why sorting matters:** Parent choices must be applied before child choices to ensure the tree structure is correct when navigating to nested choices. This is especially important when combined with type overrides via `processOverrides()`.

### setChoiceSelection(document, choiceField, selectedMemberIndex, namespaceMap)

**When:** User selects a choice member via UI.

**What it does:**
1. Validates field is a choice (`isChoice === true`) — throws `TypeError` if not
2. Validates index is in range — throws `RangeError` if not
3. Builds schema path from field's ancestor chain
4. Delegates to `DocumentUtilService.processChoiceSelection` (sets field + syncs definition)
5. Cascade-invalidates all descendant selections

**After calling:** Use `dataMapperProvider.updateDocument()` to persist and re-visualize.

### clearChoiceSelection(document, choiceField, namespaceMap)

**When:** User clears a selection ("Show All Options").

**What it does:**
1. Validates field is a choice — throws `TypeError` if not
2. No-op if `selectedMemberIndex` is already `undefined`
3. Delegates to `DocumentUtilService.removeChoiceSelection` (clears field + removes from definition)
4. Cascade-invalidates all descendant selections

### buildChoicePath(choiceField, namespaceMap) -> string

Wrapper for `SchemaPathService.build()`. Walks the field's ancestor chain to construct the schema path string.

### resolveChoicePath(document, choicePath, namespaceMap) -> IField | undefined

Wrapper for `SchemaPathService.navigateToChoiceField()`. Navigates the document tree to find a choice field by its schema path.

## Flow: User Selects "phone" on a Choice

```
1. UI calls setChoiceSelection(doc, choiceField, 1, nsMap)
       |
2.     +-- Validates: choiceField.isChoice === true
       +-- Validates: 1 < choiceField.fields.length
       |
3.     +-- SchemaPathService.build(choiceField, nsMap)
       |   -> walks ancestors: choiceField -> Root -> document
       |   -> produces: "/ns0:Root/{choice:0}"
       |
4.     +-- DocumentUtilService.processChoiceSelection(doc, selection, nsMap)
       |   +-- Navigates to field via path
       |   +-- Sets choiceField.selectedMemberIndex = 1
       |   +-- doc.definition.choiceSelections ??= []
       |   +-- Pushes {schemaPath, selectedMemberIndex: 1}
       |
5.     +-- DocumentUtilService.invalidateDescendants(doc, "/ns0:Root/{choice:0}")
           +-- Removes selections with paths starting with "/ns0:Root/{choice:0}/"
```

## Flow: Document Reload with Saved Selections

```
1. Load .kaoto metadata
   -> [{schemaPath: "/ns0:Root/{choice:0}", selectedMemberIndex: 1}]
       |
2. applyChoiceSelections(newDoc, savedSelections, nsMap)
       |
3.     +-- Sort by depth: ensures "/ns0:Root/{choice:0}" (depth 2)
       |   is applied before "/ns0:Root/{choice:0}/ns0:Phone/{choice:0}" (depth 4)
       |
4.     +-- For each selection:
       |   +-- Navigate to field -> found? continue : warn + skip
       |   +-- Index valid? continue : warn + skip
       |   +-- DocumentUtilService.processChoiceSelection(...)
       |       -> sets field.selectedMemberIndex
       |       -> syncs definition.choiceSelections
```

## Dependencies

| Dependency | Role |
|---|---|
| `SchemaPathService` | Path building (field -> string) and navigation (string -> field) |
| `DocumentUtilService` | Low-level field mutation, definition sync, cascade invalidation |
| `IChoiceSelection` (metadata.ts) | Data model for persisted selections |
| `IField.isChoice` / `.selectedMemberIndex` (document.ts) | In-memory field state |

## Integration with Existing Code

### VisualizationService

Already reads `field.selectedMemberIndex` at `visualization.service.ts:81`:
- When set: shows only the selected member's children
- When undefined: shows all choice members as options

### FieldTypeOverrideService

Has parallel methods (`applyChoiceSelection`, `revertChoiceSelection`) that serve the same purpose via a different entry point. Both services use the same underlying `DocumentUtilService` methods.

### processOverrides (unified initialization)

`DocumentUtilService.processOverrides()` combines type overrides and choice selections, sorts by depth (shallower first), and applies type overrides before choice selections at equal depth. This prevents stale navigation when a type override collapses a subtree.

## Error Handling

| Scenario | Method | Behavior |
|---|---|---|
| Invalid path on load | `applyChoiceSelections` | `console.warn` + skip, other selections still applied |
| Invalid index on load | `applyChoiceSelections` | `console.warn` + skip, field unchanged |
| Non-choice field | `setChoiceSelection` / `clearChoiceSelection` | Throws `TypeError` |
| Index out of range | `setChoiceSelection` | Throws `RangeError` |
| Already cleared | `clearChoiceSelection` | No-op (early return) |

## Test Coverage

31 tests covering:
- Path building/resolution (top-level, nested, sibling, invalid)
- Set selection (valid, boundary index 0, definition sync, errors, cascade invalidation)
- Clear selection (valid, already cleared, errors, cascade invalidation)
- Apply selections (single, multiple, depth ordering, invalid paths, invalid indices, partial, empty)
- Integration (set -> persist -> reload -> clear, multiple nested selections)
