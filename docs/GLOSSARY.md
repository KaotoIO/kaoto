# Kaoto Glossary

This glossary defines the canonical terminology for Kaoto's visual editor and how each concept maps to the
underlying integration domain.

Terms are organized from broad to specific:

- **DSL** -- the supported file formats and their capabilities.
- **Generic layer** -- concepts that belong to the visual editor itself and are DSL-agnostic.
- **Camel DSL layer** -- concepts specific to Apache Camel Routes, Kamelet, and Pipe DSLs.

---

## DSL

A **DSL** (Domain-Specific Language) in Kaoto is a **file format** for describing integrations. Kaoto
detects the DSL from the file being edited and switches its visual editing rules accordingly -- which nodes
are available in the catalog, how the canvas is laid out, and how many flows the file can contain.

Kaoto currently supports four DSLs:

| DSL | File format | Flows per file |
|-----|-------------|---------------|
| **Camel Routes** | `.camel.yaml` | Multiple |
| **Kamelet** | `.kamelet.yaml` | Single |
| **Pipe** | `.pipe.yaml` | Single |
| **Citrus** | Citrus YAML test | Single |

---

## Generic Layer

### Flow

A top-level unit of work rendered on the Kaoto canvas. Every top-level entity in a DSL file produces
exactly one flow in the visualization. A flow owns a graph of nodes.

Flows come in two kinds:

- **Executable flows** -- have a consumer start point and an end, representing a runnable integration path.
  Examples: a Camel `route`, a Kamelet, a Pipe, a Citrus test.
- **Configuration flows** -- define cross-cutting rules or settings with no consumer start point.
  Examples: `routeConfiguration`, `onException`, `intercept`, `onCompletion`, `restConfiguration`.

Both kinds are equally valid flows in Kaoto's model; the distinction is informational.

**Camel mapping:** Each of the following produces one flow: `route`, `routeConfiguration`, `rest`,
`onException`, `intercept`, `onCompletion`, `restConfiguration`.

---

### Group

A node whose `isGroup` flag is `true`, rendered as an expandable container that holds child nodes. A group
is not a separate model type -- it is a regular `IVisualizationNode` / `CanvasNode` promoted to group status
when its underlying processor declares child step properties.

When **expanded**, a group renders as a bordered rectangle (`CustomGroupExpanded`) with a title bar, icon,
and its children laid out inside. When **collapsed**, it renders as a normal node with a child-count badge.

**Camel mapping:** Any processor that can contain child steps: `choice`, `split`, `filter`, `doTry`,
`circuitBreaker`, `multicast`, `loadBalance`, `aggregate`, `loop`, `pipeline`, `saga`, `resequence`, `step`,
and the `from` / `when` / `otherwise` / `doCatch` / `doFinally` / `onFallback` clauses. The top-level route
node is always a group.

---

### Node

A single visual element on the canvas, representing one executable step or structural element within a Flow.
Corresponds to `IVisualizationNode` in the code.

Nodes form a **doubly-linked list** for sequential flow (`previousNode` / `nextNode`) and a **tree** for
nesting (`parentNode` / `children`). Every node carries an `IVisualizationNodeData` payload with its name,
path into the underlying definition, icon, label, and JSON schema for its configuration form.

**Camel mapping:** An EIP processor instance (e.g. `log`, `to`, `choice`), the `from` consumer, or the
route group node.

---

### Placeholder

A special node (`isPlaceholder: true`) that represents an insertion point where new steps can be added.
Placeholders are not executable -- they exist purely as interaction affordances.

Two fixed types:

| Type | Name | Purpose |
|------|------|---------|
| `Placeholder` | `'placeholder'` | Generic "add step" target at the end of a branch |
| `PlaceholderSpecialChild` | `'placeholder-special-child'` | Empty-state target for special children (e.g. empty REST DSL) |

Dynamic placeholders are also created for specific clause slots (e.g. a `when` placeholder inside a `choice`
group), using the clause name as the placeholder name.

---

### Edge

A directional connection between two nodes, representing flow of execution. Corresponds to `CanvasEdge` in
the code (extending PatternFly Topology's `EdgeModel`).

Edges are derived automatically from the `nextNode` linked-list relationships in the `IVisualizationNode`
tree. Each edge renders as a straight SVG path with a connector arrow and an "add step" icon that appears
on hover at the midpoint.

**Edge ID format:** `"sourceId >>> targetId"`.

---

### Node Identity

> **Status: in progress** -- the `NodeIdentity` interface is defined; population across all DSLs is being
> rolled out incrementally.

A single piece of identity information for a node: a name and its catalog kind.

```typescript
interface NodeIdentity {
  name: string;
  catalogKind: CatalogKind;
}
```

---

### Primary / Secondary / Tertiary Node ID

> **Status: in progress** -- see Node Identity above.

The ordered set of identities that describe what a node *is*. The primary is always required; secondary and
tertiary are optional and DSL-specific.

Each DSL is described below from simplest (one level) to most complex (up to three levels).

---

#### Pipe

A Pipe node always has exactly one identity: the Kamelet it represents. There is no secondary or tertiary
level.

```
primaryNodeId   { name: 'timer-source', catalogKind: CatalogKind.Kamelet }
```

---

#### Citrus

A Citrus test action node always has exactly one identity: the test action name.

```
primaryNodeId   { name: 'echo', catalogKind: CatalogKind.TestAction }
```

The Citrus root group node (the flow container) is also enriched as a `CatalogKind.TestAction`.

---

#### Camel Routes (and Kamelet DSL)

The Kamelet DSL shares the same internal node structure as Camel Routes -- both use `from`, standard
processors, and the same mappers -- so the rules below apply to both DSLs.

**Simple case -- processor only (no URI):**

A processor that carries no component URI (e.g. `log`, `choice`, `split`) has only a primary identity.

```
primaryNodeId   { name: 'log', catalogKind: CatalogKind.Processor }
```

**Standard case -- processor + Component URI:**

A processor that carries a component URI (e.g. `to: timer:tick`) adds a secondary identity for the
resolved Component.

```
primaryNodeId    { name: 'to',    catalogKind: CatalogKind.Processor }
secondaryNodeId  { name: 'timer', catalogKind: CatalogKind.Component }
```

**Kamelet URI case -- processor + Kamelet URI:**

When the URI references a Kamelet (e.g. `to: kamelet:weather-source`), the secondary identity is the
`kamelet` Camel Component and the tertiary identity is the resolved Kamelet itself.

```
primaryNodeId    { name: 'to',             catalogKind: CatalogKind.Processor }
secondaryNodeId  { name: 'kamelet',        catalogKind: CatalogKind.Component }
tertiaryNodeId   { name: 'weather-source', catalogKind: CatalogKind.Kamelet  }
```

**Root group node:**

The invisible container node that wraps an entire Camel route or Kamelet flow. It carries the entity
name as its primary identity and has no secondary or tertiary.

```
primaryNodeId   { name: 'route', catalogKind: CatalogKind.Entity }
```

**`from` node:**

The consumer start node. Its primary identity is always `from`. When a URI is configured the secondary
identity is the resolved Component; when no URI is present the node is treated as a placeholder.

```
primaryNodeId    { name: 'from',  catalogKind: CatalogKind.Entity     }
secondaryNodeId  { name: 'timer', catalogKind: CatalogKind.Component  }  ← present when URI is set
```

---

## Camel DSL Layer

### EIP (Enterprise Integration Pattern)

A pattern-based processing element such as Choice, Filter, Split, Aggregate. The term is used when referring
specifically to the structural/behavioral role of a processor.

**Camel mapping:** Maps to `CatalogKind.Pattern` and `CatalogKind.Processor` in the catalog. In the Camel
processor type system, `ProcessorDefinition`.

**Scope:** The generic layer should use `NodeKind` or `primaryNodeId.catalogKind` to represent this concept.

**Deprecated aliases:** *processor* (when used to mean "an EIP" -- overloaded; see below), *element* (as in
`ICamelElementLookupResult`).

---

### Processor

In Camel specifically: any executable unit in a `ProcessorDefinition` -- this includes EIPs, the `from`
consumer, and structural containers. In Kaoto code: the DSL-level name of a node type (e.g. `'log'`, `'to'`,
`'choice'`) as defined by the Camel catalog.

**Use carefully** -- this term is scoped to Camel.

**Camel mapping:** `keyof ProcessorDefinition` from `@kaoto/camel-catalog/types`. Maps to
`CatalogKind.Processor` or `CatalogKind.Pattern`.

**Scope:** Camel DSL layer. The generic layer must not use this term.

**Deprecated aliases:** In current code, `processorName` is used as a field on the generic
`IVisualizationNodeData` -- this is the primary target for removal.

---

### Component

A transport-layer adapter such as AMQP, Timer, HTTP, File. Bound to a `from`, `to`, `toD`, or `poll` EIP
via a URI. Maps to `CatalogKind.Component`.

**Camel mapping:** `ICamelComponentDefinition`; resolved from the URI string (e.g. `timer:tick` ->
`componentName: 'timer'`).

**Scope:** Camel DSL layer. In the generic model, the "component" role is captured by `secondaryNodeId`.

**Deprecated aliases:** `componentName` as a field in the generic data layer.

---

### Kamelet

A reusable integration snippet packaged as a Camel extension, usable as a source, sink, or action. In Pipes:
the primary node type. In Camel Routes: a specialization of the Component layer (attached via `kamelet:` URI
prefix).

**Camel mapping:** `CatalogKind.Kamelet`; `IKameletDefinition`.

**Scope:** Camel DSL and Pipes DSL layers. In the generic model, a Kamelet-sourced node may appear as
`primaryNodeId` (in Pipes) or `tertiaryNodeId` (in Camel Routes with `kamelet:` URI).

---

### Route

The top-level structural container for a Camel integration flow. In Kaoto's visualization, the root
`IVisualizationNode` of type `EntityType.CamelRoute` or `EntityType.Kamelet`.

**Camel mapping:** `processorName: 'route'`, `CatalogKind.Entity`.

**Scope:** Camel DSL layer. In the generic model, this corresponds to a Flow's root node, identified by
`data.entity !== undefined`.

---

### Step

**Avoid as a generic term.** Use *Node* for the generic concept. Reserve *step* only for:

1. The Camel `step` EIP specifically -- a scoped sequential sub-pipeline within a route.
2. `steps` as an array property name in route definitions.

**Camel mapping:** `CatalogKind.Pattern`, name `'step'`.

---

### Pattern (catalog kind)

A catalog category grouping EIPs that have JSON schema definitions but are not `from` / `route` entities.

**Camel mapping:** `CatalogKind.Pattern` in code.

**Scope:** Camel catalog infrastructure layer. Do not use in user-facing documentation.

**Deprecated aliases:** *processor* (when used as a catalog-kind synonym for Pattern).

---

### Entity (catalog kind)

A top-level Camel catalog entry representing a first-class flow element: `route`, `from`,
`routeConfiguration`, `intercept`, `onException`, etc. Distinguished from Patterns because they appear at
the root of a route definition.

**Camel mapping:** `CatalogKind.Entity` in code.

---

### Branch Types

The three ways a processor can contain nested processors, as defined by
`CamelProcessorStepsProperties.type`:

| Type | Description | Examples |
|------|-------------|---------|
| `branch` | A `steps[]` array of sequential processors | `from.steps`, `when.steps`, `filter.steps` |
| `single-clause` | A single nested processor | `choice.otherwise`, `circuitBreaker.onFallback`, `doTry.doFinally` |
| `array-clause` | An array of clause-type processors | `choice.when[]`, `doTry.doCatch[]`, `rest.get[]` |

These types determine how the node mapper creates child visualization nodes and how placeholders are
generated for each slot.
