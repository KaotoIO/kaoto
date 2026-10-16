---
title: Glossary
type: reference
version: 1.0
last_updated: 2025-01-30
tags: [glossary, terminology, definitions]
---

# Glossary

Product-specific terms, acronyms, and concepts used by the Kaoto team.

Terms are organised from broad to specific:

- **Common acronyms** — short forms used across the codebase and team
- **DSLs** — supported file formats and their capabilities
- **Generic layer** — concepts that belong to the visual editor itself and are DSL-agnostic
- **Camel DSL layer** — concepts specific to Apache Camel Routes, Kamelet, and Pipe DSLs
- **Domain concepts** — higher-level product and team concepts

---

## Common acronyms

- **DSL**: Domain-Specific Language — in Kaoto, a DSL is a **file format** for describing integrations. Kaoto detects the DSL from the file being edited and switches its visual editing rules accordingly (available nodes, canvas layout, flows per file).
- **EIP**: Enterprise Integration Pattern — a pattern-based processing element (e.g. Choice, Filter, Split, Aggregate) from the book by Hohpe & Woolf. Maps to `CatalogKind.Pattern` / `CatalogKind.Processor` in the catalog. **Scope:** The generic layer should use `primaryNodeId.catalogKind` to represent this concept — do not use "EIP" as a field or type name in DSL-agnostic code.
- **PR**: Pull Request — all changes to `KaotoIO/kaoto` go through a PR reviewed by maintainers.
- **E2E**: End-to-end tests — Cypress tests in `packages/ui-tests/cypress/`.
- **RHBAC**: Red Hat Build of Apache Camel — the Red Hat product distribution of Apache Camel.

---

## DSLs (supported file formats)

| DSL | File format | Flows per file |
|-----|-------------|----------------|
| **Camel Routes** | `.camel.yaml` | Multiple |
| **Kamelet** | `.kamelet.yaml` | Single |
| **Pipe** | `.pipe.yaml` | Single |
| **Citrus** | Citrus YAML test | Single |

---

## Generic layer

These terms belong to Kaoto's visual editor model and are DSL-agnostic.

### Flow

A top-level unit of work rendered on the Kaoto canvas. Every top-level entity in a DSL file produces exactly one flow. A flow owns a graph of nodes.

Flows come in two kinds:

- **Executable flows** — have a consumer start point and an end, representing a runnable integration path. Examples: a Camel `route`, a Kamelet, a Pipe, a Citrus test.
- **Configuration flows** — define cross-cutting rules or settings with no consumer start point. Examples: `routeConfiguration`, `onException`, `intercept`, `onCompletion`, `restConfiguration`.

Both kinds are equally valid flows in Kaoto's model; the distinction is informational.

**Camel mapping:** Each of the following produces one flow: `route`, `routeConfiguration`, `rest`, `onException`, `intercept`, `onCompletion`, `restConfiguration`.

### Group

A node whose `isGroup` flag is `true`, rendered as an expandable container that holds child nodes. A group is not a separate model type — it is a regular `IVisualizationNode` / `CanvasNode` promoted to group status when its underlying processor declares child step properties.

When **expanded**, renders as a bordered rectangle (`CustomGroupExpanded`) with a title bar, icon, and children laid out inside. When **collapsed**, renders as a normal node with a child-count badge.

**Camel mapping:** Any processor that can contain child steps: `choice`, `split`, `filter`, `doTry`, `circuitBreaker`, `multicast`, `loadBalance`, `aggregate`, `loop`, `pipeline`, `saga`, `resequence`, `step`, and the `from` / `when` / `otherwise` / `doCatch` / `doFinally` / `onFallback` clauses. The top-level route node is always a group.

### Node

A single visual element on the canvas, representing one executable step or structural element within a Flow. Corresponds to `IVisualizationNode` in the code.

Nodes form a **doubly-linked list** for sequential flow (`previousNode` / `nextNode`) and a **tree** for nesting (`parentNode` / `children`). Every node carries an `IVisualizationNodeData` payload with its name, path into the underlying definition, icon, label, and JSON schema for its configuration form.

**Camel mapping:** An EIP processor instance (e.g. `log`, `to`, `choice`), the `from` consumer, or the route group node.

### Placeholder

A special node (`isPlaceholder: true`) that represents an insertion point where new steps can be added. Placeholders are not executable — they exist purely as interaction affordances.

Two fixed types:

| Type | Name | Purpose |
|------|------|---------|
| `Placeholder` | `'placeholder'` | Generic "add step" target at the end of a branch |
| `PlaceholderSpecialChild` | `'placeholder-special-child'` | Empty-state target for special children (e.g. empty REST DSL) |

Dynamic placeholders are also created for specific clause slots (e.g. a `when` placeholder inside a `choice` group), using the clause name as the placeholder name.

### Edge

A directional connection between two nodes, representing flow of execution. Corresponds to `CanvasEdge` in the code (extending PatternFly Topology's `EdgeModel`).

Edges are derived automatically from the `nextNode` linked-list relationships in the `IVisualizationNode` tree. Each edge renders as a straight SVG path with a connector arrow and an "add step" icon on hover at the midpoint.

**Edge ID format:** `"sourceId >>> targetId"`.

### Canvas

The visual drag-and-drop area where users build and edit flows. Implemented using `@patternfly/react-topology`.

### Node Identity

A single piece of identity information for a node: a name and its catalog kind.

```typescript
interface NodeIdentity {
  name: string;
  catalogKind: CatalogKind;
}
```

### Primary / Secondary / Tertiary Node ID

The ordered set of identities that describe what a node *is*. The primary is always required; secondary and tertiary are optional and DSL-specific.

**Pipe:** Always exactly one identity — the Kamelet it represents.
```
primaryNodeId   { name: 'timer-source', catalogKind: CatalogKind.Kamelet }
```

**Citrus:** Always exactly one identity — the test action name. The Citrus root group node (the flow container) is also enriched as a `CatalogKind.TestAction`.
```
primaryNodeId   { name: 'echo', catalogKind: CatalogKind.TestAction }
```

**Camel Routes / Kamelet DSL** (the Kamelet DSL shares the same node structure):

- *Processor only (no URI):*
```
primaryNodeId   { name: 'log', catalogKind: CatalogKind.Processor }
```
- *Processor + Component URI:*
```
primaryNodeId    { name: 'to',    catalogKind: CatalogKind.Processor }
secondaryNodeId  { name: 'timer', catalogKind: CatalogKind.Component }
```
- *Processor + Kamelet URI:*
```
primaryNodeId    { name: 'to',             catalogKind: CatalogKind.Processor }
secondaryNodeId  { name: 'kamelet',        catalogKind: CatalogKind.Component }
tertiaryNodeId   { name: 'weather-source', catalogKind: CatalogKind.Kamelet  }
```
- *Root group node:*
```
primaryNodeId   { name: 'route', catalogKind: CatalogKind.Entity }
```
- *`from` node:*
```
primaryNodeId    { name: 'from',  catalogKind: CatalogKind.Entity    }
secondaryNodeId  { name: 'timer', catalogKind: CatalogKind.Component }  ← present when URI is set
```

---

## Camel DSL layer

These terms are specific to Apache Camel and the Camel-family DSLs.

### Route

The top-level structural container for a Camel integration flow — a `from` (source endpoint) followed by one or more processors ending at a `to` (destination). The primary artifact users create in Kaoto. In the generic model this corresponds to a Flow's root node, identified by `data.entity !== undefined`.

**Camel mapping:** `CatalogKind.Entity`.

**Scope:** Camel DSL layer. In the generic model, use `data.entity !== undefined` to identify the root node.

### Kamelet

A reusable integration snippet packaged as a Camel extension, usable as a source, sink, or action. **Not the same as a route** — a Kamelet is a template/building block that must be instantiated (e.g. in a Pipe) to run; a route is a concrete pipeline.

- In **Pipes**: the primary node type.
- In **Camel Routes**: a specialisation of the Component layer, attached via `kamelet:` URI prefix.

**Camel mapping:** `CatalogKind.Kamelet`; `IKameletDefinition`. In the generic model, appears as `primaryNodeId` (Pipes) or `tertiaryNodeId` (Camel Routes with `kamelet:` URI).

### Camel Pipe

A Camel resource that connects a source Kamelet to a sink Kamelet (optionally via action steps). Formerly called `KameletBinding`. **Not the same as a route** — a Pipe is specifically a Kamelet-to-Kamelet composition.

### Component

A transport-layer adapter (e.g. AMQP, Timer, HTTP, File) bound to a `from`, `to`, `toD`, or `poll` EIP via a URI.

**Camel mapping:** `ICamelComponentDefinition`; resolved from the URI string (e.g. `timer:tick` → `componentName: 'timer'`). Maps to `CatalogKind.Component`. In the generic model, captured by `secondaryNodeId`.

### Processor

In Camel specifically: any executable unit in a `ProcessorDefinition` — includes EIPs, the `from` consumer, and structural containers. The DSL-level name of a node type (e.g. `'log'`, `'to'`, `'choice'`) as defined by the Camel catalog.

**Use carefully** — scoped to the Camel DSL layer. The generic layer must use *Node* instead.

**Camel mapping:** `keyof ProcessorDefinition` from `@kaoto/camel-catalog/types`. Maps to `CatalogKind.Processor` or `CatalogKind.Pattern`.

### Step

**Avoid as a generic term.** Use *Node* for the generic concept. Reserve *step* only for:

1. The Camel `step` EIP — a scoped sequential sub-pipeline within a route.
2. `steps` as an array property name in route definitions.

**Camel mapping:** `CatalogKind.Pattern`, name `'step'`.

### Component catalog

The searchable library of all Camel components, EIPs, and Kamelets surfaced in Kaoto's sidebar. Generated from Camel runtime metadata via OpenJDK tooling. Never hand-edit generated catalog files — regenerate with project tooling.

### Branch types

The three ways a processor can contain nested processors, as defined by `CamelProcessorStepsProperties.type`:

| Type | Description | Examples |
|------|-------------|---------|
| `branch` | A `steps[]` array of sequential processors | `from.steps`, `when.steps`, `filter.steps` |
| `single-clause` | A single nested processor | `choice.otherwise`, `circuitBreaker.onFallback`, `doTry.doFinally` |
| `array-clause` | An array of clause-type processors | `choice.when[]`, `doTry.doCatch[]`, `rest.get[]` |

These types determine how the node mapper creates child visualization nodes and how placeholders are generated for each slot.

### Entity (catalog kind)

A top-level Camel catalog entry representing a first-class flow element: `route`, `from`, `routeConfiguration`, `intercept`, `onException`, etc. Distinguished from Patterns because they appear at the root of a route definition.

**Camel mapping:** `CatalogKind.Entity`.

### Pattern (catalog kind)

A catalog category grouping EIPs that have JSON schema definitions but are not `from` / `route` entities.

**Camel mapping:** `CatalogKind.Pattern`. Do not use in user-facing documentation.

---

## Domain concepts

**Routes vs Kamelets — key distinction**: A common point of confusion for newcomers.
- A **route** is a standalone Camel integration pipeline (`from` → steps → `to`). It runs as-is.
- A **Kamelet** is a reusable, parameterised snippet that acts as a source, sink, or action. It must be instantiated (e.g. in a Pipe) to run. Think of Kamelets as functions and routes as programs.

**DataMapper**: The visual field-mapping editor in Kaoto for defining data transformations between schemas. A current top priority for improvement.

**Visual route editing**: The core value proposition of Kaoto — users interact with a graphical canvas rather than editing YAML/Java source directly. Changes on the canvas are serialised back to YAML DSL.

**Low-code integration**: An approach where integration logic is assembled from pre-built components via a visual interface, reducing the need for hand-written code.

**Monorepo**: The Kaoto repository contains multiple packages managed together with Yarn workspaces: the main UI (`@kaoto/kaoto`), tests/Storybook (`@kaoto/kaoto-tests`), and the VS Code extension (`vscode-kaoto`).
