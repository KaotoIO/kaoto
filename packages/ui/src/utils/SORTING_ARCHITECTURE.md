# Camel Component Sorter Architecture Plan

## Objective
Design a clean, reusable, and readable architecture for sorting Camel processor properties according to the Camel Catalog metadata.

---

## The KOW - Kaoto Object Walker 🐄

**KOW** (Kaoto Object Walker) is a generic tree infrastructure for traversing and operating on structured data (Camel routes, Citrus tests, etc.).

---

## Implementation Order

1. **Phase 1: Generic KOW Infrastructure**
   - `IKowNode<TData, TType, TCatalog>` - Generic node interface
   - `IKowNodeResolver<TType, TCatalog>` - Strategy for building trees
   - `IKowNodeVisitor<TType, TResult>` - Visitor for operations
   - `BaseKowNode` - Generic implementation

2. **Phase 2: Camel-Specific Implementation**
   - `ICamelKowNode` - Camel-specific node interface
   - `CamelKowNodeType` - Entity, Eip, Component, Language, etc.
   - `CamelNodeResolver` - Knows how to find Camel children/types
   - `createCamelTree()`, `createRouteTree()` - Factory functions

3. **Phase 3: Shared Utilities**
   - Move `getComponentNameFromUri` to `CamelUriHelper`
   - Create `getProcessorName` utility

4. **Phase 4: Sorting Visitor**
   - `SortingVisitor` - Traverses tree and sorts properties
   - Refactor `CamelComponentSorter` to use KOW + SortingVisitor

---

## Architecture Overview

The design follows a **layered approach** with **KOW** as the core abstraction:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CamelComponentSorter                          │
│  Entry point: sortEntityDefinition(entityName, data)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ICamelModelNode                             │
│  Model Tree: Unified traversal of Camel entities                │
│  - getChildren(), getParent(), getNextSibling()                 │
│  - isEntity(), isEip(), isComponent(), isLanguage()             │
│  - name, path, type, data, catalogEntry                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ Catalog      │    │ Sorting          │    │ Node              │
│ Resolution   │    │ Strategies       │    │ Factory           │
└──────────────┘    └──────────────────┘    └───────────────────┘
```

**Key insight**: The Model Tree provides a unified way to traverse Camel entities. The sorter is the **first consumer**, but validation, search, and visualization can reuse it.

---

## Core Design Principles

### 1. **Single Responsibility**
Each function handles one concern:
- **Catalog resolution** → Find the right catalog entry
- **Property sorting** → Order keys by index or alphabetically
- **Recursive traversal** → Handle nested structures

### 2. **Pure Functions for Sorting**
Sorting functions are pure (no side effects), making them testable and predictable.

### 3. **Consistent Fallback Strategy**
When catalog entry not found → sort alphabetically.

---

## File Structure

```
packages/ui/src/
├── utils/
│   ├── camel-component-sorter.ts       # Entry point (uses KOW + SortingVisitor)
│   ├── camel-uri-helper.ts             # Add getComponentNameFromUri here
│   └── get-processor-name.ts           # NEW: Extract EIP name from wrapper
│
└── models/
    └── kow/                            # KOW - Kaoto Object Walker 🐄
        ├── index.ts                    # Re-exports all
        │
        │   # Generic Base (domain-agnostic)
        ├── base/
        │   ├── kow-node.ts             # IKowNode<TData, TType, TCatalog>
        │   ├── kow-node-resolver.ts    # IKowNodeResolver<TType, TCatalog>
        │   ├── kow-node-visitor.ts     # IKowNodeVisitor<TType, TResult>
        │   └── kow-node.impl.ts        # BaseKowNode class (with accept())
        │
        │   # Visitors (reusable across domains)
        ├── visitors/
        │   ├── index.ts                # Re-exports visitors
        │   ├── sorting.visitor.ts      # SortingVisitor
        │   ├── validation.visitor.ts   # ValidationVisitor (future)
        │   └── search.visitor.ts       # SearchVisitor (future)
        │
        │   # Camel-Specific Implementation
        └── camel/
            ├── index.ts                # Re-exports Camel types
            ├── camel-kow-node.ts       # ICamelKowNode interface
            ├── camel-kow-node-type.ts  # CamelKowNodeType enum
            ├── camel-node-resolver.ts  # CamelNodeResolver class
            └── camel-kow-tree.ts       # createCamelTree(), createRouteTree(), etc.
```

---

## Service Responsibilities

### `camel-component-sorter.ts` (~60 lines)
- Entry point: `sortEntityDefinition(entityName, data)`
- Creates Model Tree from data
- Traverses tree and sorts each node's properties
- Reconstructs sorted data from tree
- Called from visual entities' `toJSON()` methods

### `camel-model-tree/` (Model Tree Infrastructure)

**`camel-model-node.ts`** - Interface definition
```typescript
interface ICamelModelNode {
  name: string;
  path: string;
  type: CamelModelNodeType;
  data: Record<string, unknown>;
  catalogEntry?: ICamelProcessorDefinition | ICamelComponentDefinition;

  // Navigation
  getParent(): ICamelModelNode | undefined;
  getChildren(): ICamelModelNode[];
  getNextSibling(): ICamelModelNode | undefined;
  getPreviousSibling(): ICamelModelNode | undefined;

  // Type guards
  isEntity(): boolean;
  isEip(): boolean;
  isComponent(): boolean;
  isLanguage(): boolean;
  isDataformat(): boolean;

  // Utilities
  hasChildren(): boolean;
  getUri(): string | undefined;
  getComponentName(): string | undefined;
}
```

**`camel-model-node.impl.ts`** (~150 lines) - Class implementation
- Lazy child resolution (only builds children when `getChildren()` is called)
- Caches children after first resolution
- Uses catalog to determine node type and children

**`create-model-tree.ts`** (~30 lines) - Factory
```typescript
function createModelTree(entityName: string, data: Record<string, unknown>): ICamelModelNode
```

### `sorting/catalog-lookup.service.ts` (~80 lines)
- `getCatalogKind(processorName)` → determines Entity/Pattern/Language/etc.
- `getCatalogProperties(kind, name)` → retrieves indexed properties
- `isLanguage(name)`, `isDataformat(name)`, `isLoadbalancer(name)`
- Constants: `ENTITY_PROCESSORS`, `URI_PROCESSORS`

### `sorting/property-sorting.service.ts` (~60 lines)
- `sortByIndex(obj, catalogProperties)` → pure function, sorts by index
- `sortAlphabetically(obj)` → pure function, sorts A-Z
- `sortNodeProperties(node: ICamelModelNode)` → sorts a node's properties using its catalog entry

---

## Function Signatures

### Entry Point
```typescript
// Main public method - receives entity name from Camel YAML DSL
// Entity names: beans, route, from, intercept, interceptFrom, interceptSendToEndpoint,
//               onCompletion, onException, routeConfiguration, rest, restConfiguration,
//               errorHandler, routeTemplate, templatedRoute, dataFormats
sortEntityDefinition<T>(entityName: string, data: T): T
```

### Catalog Resolution Functions
```typescript
// Determine which catalog to use (Entity, Pattern, Language, etc.)
getCatalogKind(processorName: string): CatalogKind

// Get properties with index from catalog
getCatalogProperties(catalogKind: CatalogKind, name: string):
  Record<string, CamelPropertyCommon> | undefined

// Type guards
isLanguage(name: string): boolean
isDataformat(name: string): boolean
isLoadbalancer(name: string): boolean
```

### Property Type Detection (from catalog metadata)
```typescript
// Check if property is an array (needs iteration, preserve order)
// Detection: type === "array" OR javaType.includes("List")
isArrayProperty(property: CamelPropertyCommon): boolean

// Check if property contains nested EIP(s) (needs recursive sorting)
// Detection: kind === "element" AND oneOf exists
isNestedEipProperty(property: CamelPropertyCommon): boolean

// Check if property is primitive (just sort by index, no recursion)
// Detection: kind === "attribute" OR type is string/boolean/integer/enum
isPrimitiveProperty(property: CamelPropertyCommon): boolean

// Get the EIP type(s) for a nested property
// Returns: oneOf array like ["when", "otherwise"] or ["to", "toD", "choice", ...]
getNestedEipTypes(property: CamelPropertyCommon): string[] | undefined
```

### Sorting Functions
```typescript
// Sort object keys by catalog index (pure function)
sortByIndex<T>(obj: T, catalogProperties: Record<string, CamelPropertyCommon>): T

// Sort object keys alphabetically (pure function)
sortAlphabetically<T>(obj: T): T

// Combined: sort by index if catalog found, else alphabetically
sortProperties<T>(obj: T, catalogKind: CatalogKind, processorName: string): T
```

### Shared Utility Functions (consolidate existing code)

#### 1. Move `getComponentNameFromUri` to `CamelUriHelper`

**Current location**: `CamelComponentSchemaService.getComponentNameFromUri` (lines 300-310)
**New location**: `CamelUriHelper.getComponentNameFromUri`

```typescript
// Add to /packages/ui/src/utils/camel-uri-helper.ts (CamelUriHelper class)
// Extract component name from URI
// Example: 'timer:tick?period=1000' → 'timer'
// Example: 'kamelet:kafka-sink?topic=foo' → 'kamelet:kafka-sink'
static getComponentNameFromUri(uri: string): string | undefined {
  if (!uri) return undefined;
  const uriParts = uri.split(':');
  if (uriParts[0] === 'kamelet' && uriParts.length > 1) {
    const kameletName = uriParts[1].split('?')[0];
    return uriParts[0] + ':' + kameletName;
  }
  return uriParts[0];
}
```

**Refactor**: Update `CamelComponentSchemaService` to call `CamelUriHelper.getComponentNameFromUri` instead of having its own copy.

#### 2. New utility: `getProcessorName`

**Location**: New file `/packages/ui/src/utils/get-processor-name.ts` or add to existing utils

```typescript
// Extract the single key (EIP/processor name) from a wrapper object
// Currently duplicated in: base-node-mapper.ts:79, camel-route-configuration-visual-entity.ts:151, common-parser.ts:178
// Example: { to: { uri: 'log:test' } } → 'to'
// Example: { simple: { expression: '${body}' } } → 'simple'
export function getProcessorName(wrapper: Record<string, unknown>): string | undefined {
  const keys = Object.keys(wrapper);
  return keys.length === 1 ? keys[0] : undefined;
}
```

**Detection flow for URI-based processors:**
1. Get EIP properties from catalog
2. Check if EIP data has a `uri` property (string value)
3. If yes, extract component name using `CamelUriHelper.getComponentNameFromUri(data.uri)`
4. Lookup Component catalog for that component to sort `parameters`

### Recursive Traversal Functions
```typescript
// Process a single step (uses getProcessorName to extract EIP type, sorts recursively)
processStep(step: Record<string, unknown>): Record<string, unknown>

// Process steps array (preserves order, sorts each element)
processSteps(steps: unknown[]): unknown[]

// Process component parameters using component catalog
processParameters(parameters: Record<string, unknown>, uri: string): Record<string, unknown>

// Process nested value based on its type
processValue(value: unknown, propertyName: string, context: ProcessingContext): unknown
```

---

## Processing Flow

### Step 1: Entry
```typescript
sortEntityDefinition('route', routeData)
// entityName comes from Camel YAML DSL type (route, from, intercept, etc.)
```

### Step 2: Create Model Tree
```typescript
const tree = createModelTree('route', routeData);
// Returns ICamelModelNode with:
//   - name: 'route'
//   - type: CamelModelNodeType.Entity
//   - catalogEntry: route catalog definition
//   - getChildren() → [fromNode, ...]
```

### Step 3: Traverse & Sort
```typescript
function sortNode(node: ICamelModelNode): Record<string, unknown> {
  // Sort this node's properties by catalog index
  const sortedData = sortNodeProperties(node);

  // Recursively sort children
  for (const child of node.getChildren()) {
    const childKey = child.name;
    sortedData[childKey] = sortNode(child);
  }

  return sortedData;
}
```

### Step 4: Return Sorted Object
The tree traversal produces a new object with all properties sorted at every level.

### Example Tree Structure

```
createModelTree('route', routeData)
│
└── ICamelModelNode (name: 'route', type: Entity)
    ├── properties: { id, description, from }  ← sorted by catalog index
    │
    └── getChildren() → [
          ICamelModelNode (name: 'from', type: Entity)
          ├── properties: { id, uri, parameters, steps }
          ├── getUri() → 'timer:tick'
          ├── getComponentName() → 'timer'
          │
          └── getChildren() → [
                ICamelModelNode (name: 'to', type: Eip)
                ├── properties: { id, uri, parameters }
                └── ...

                ICamelModelNode (name: 'choice', type: Eip)
                ├── properties: { id, when, otherwise }
                └── getChildren() → [
                      ICamelModelNode (name: 'when', type: Eip)
                      └── ...
                    ]
              ]
        ]
```

---

## Property Type Detection Rules

The catalog metadata tells us exactly how to handle each property:

| Property Type | Detection Logic | Action |
|---------------|-----------------|--------|
| **Primitive** | `kind === "attribute"` OR `type` is `string/boolean/integer/enum` | Sort by index, no recursion |
| **Array of EIPs** | `type === "array"` AND `oneOf` exists | Preserve order, recurse into each element |
| **Single EIP** | `kind === "element"` AND `type === "object"` AND `oneOf` exists | Recurse into the object |
| **Parameters** | Property name is `parameters` (for URI processors) | Lookup Component catalog, sort by its index |

### Catalog Property Examples

**Primitive property** (just sort):
```json
"id": { "kind": "attribute", "type": "string", "index": 0 }
```

**Array of EIPs** (iterate & recurse):
```json
"when": {
  "kind": "element",
  "type": "array",
  "oneOf": ["when"],
  "index": 3
}
```

**Single nested EIP** (recurse):
```json
"otherwise": {
  "kind": "element",
  "type": "object",
  "oneOf": ["otherwise"],
  "index": 4
}
```

**Array of mixed EIPs** (iterate, detect type, recurse):
```json
"outputs": {
  "kind": "element",
  "type": "array",
  "oneOf": ["aggregate", "bean", "choice", "filter", "to", "toD", ...],
  "index": 21
}
```

---

## Handling Different Entity Types

| Type | Catalog | Example |
|------|---------|---------|
| **Entities** | `CatalogKind.Entity` | route, from, intercept, errorHandler |
| **EIPs/Patterns** | `CatalogKind.Pattern` | choice, filter, split, to, log |
| **Components** | `CatalogKind.Component` | timer, file, kafka (from URI) |
| **Languages** | `CatalogKind.Language` | simple, constant, jq, xpath |
| **Dataformats** | `CatalogKind.Dataformat` | json, xml, csv |
| **Loadbalancers** | `CatalogKind.Loadbalancer` | roundRobin, failover |

### Entity Detection (reuse from CamelComponentSchemaService:325-339)
```typescript
const ENTITY_PROCESSORS = ['route', 'intercept', 'interceptFrom',
  'interceptSendToEndpoint', 'onException', 'onCompletion', 'from'];
```

### URI Processors (need dual lookup)
```typescript
const URI_PROCESSORS = ['from', 'to', 'toD', 'poll', 'wireTap', 'enrich', 'pollEnrich'];
```

---

## Special Cases

### 1. Expressions (nested language objects)
```yaml
setBody:
  simple:
    expression: "${body}"
    resultType: java.lang.String
```
- Detect `simple`, `constant`, `jq`, etc. as Language catalog entries
- Sort their properties using Language catalog

### 2. Choice with Clauses
```yaml
choice:
  when:           # array-clause → preserve order, sort each element
    - simple: "..."
      steps: [...]
  otherwise:      # single-clause → sort its properties
    steps: [...]
```

### 3. Marshal/Unmarshal with Dataformats
```yaml
marshal:
  json:
    prettyPrint: true
    library: Jackson
```
- Detect `json`, `xml`, etc. as Dataformat catalog entries

### 4. Steps Arrays
- Preserve array order
- Each element: extract processor name (first key), sort recursively

---

## Key Files to Modify/Create

### Phase 1: Generic KOW Infrastructure

| File | Action |
|------|--------|
| `packages/ui/src/models/kow/index.ts` | **Create**: Re-exports all |
| `packages/ui/src/models/kow/base/kow-node.ts` | **Create**: IKowNode<TData, TType, TCatalog> |
| `packages/ui/src/models/kow/base/kow-node-resolver.ts` | **Create**: IKowNodeResolver interface |
| `packages/ui/src/models/kow/base/kow-node-visitor.ts` | **Create**: IKowNodeVisitor interface |
| `packages/ui/src/models/kow/base/kow-node.impl.ts` | **Create**: BaseKowNode class (with accept()) |

### Phase 2: Camel-Specific Implementation

| File | Action |
|------|--------|
| `packages/ui/src/models/kow/camel/index.ts` | **Create**: Re-exports Camel types |
| `packages/ui/src/models/kow/camel/camel-kow-node.ts` | **Create**: ICamelKowNode interface |
| `packages/ui/src/models/kow/camel/camel-kow-node-type.ts` | **Create**: CamelKowNodeType enum |
| `packages/ui/src/models/kow/camel/camel-node-resolver.ts` | **Create**: CamelNodeResolver class |
| `packages/ui/src/models/kow/camel/camel-kow-tree.ts` | **Create**: Factory functions |

### Phase 3: Shared Utilities

| File | Action |
|------|--------|
| `packages/ui/src/utils/camel-uri-helper.ts` | **Modify**: Add getComponentNameFromUri |
| `packages/ui/src/utils/get-processor-name.ts` | **Create**: Extract EIP name utility |

### Phase 4: Sorting Visitor

| File | Action |
|------|--------|
| `packages/ui/src/models/kow/visitors/index.ts` | **Create**: Re-exports visitors |
| `packages/ui/src/models/kow/visitors/sorting.visitor.ts` | **Create**: SortingVisitor |
| `packages/ui/src/utils/camel-component-sorter.ts` | Refactor to use KOW + SortingVisitor |

### Future / Optional

| File | Action |
|------|--------|
| `packages/ui/src/models/kow/visitors/validation.visitor.ts` | **Create**: ValidationVisitor |
| `packages/ui/src/models/kow/visitors/search.visitor.ts` | **Create**: SearchVisitor |
| `packages/ui/src/models/visualization/flows/support/camel-component-schema.service.ts` | Refactor to use CamelUriHelper.getComponentNameFromUri |

## Key Files to Reference

| File | Purpose |
|------|---------|
| `packages/ui/src/models/visualization/flows/camel-catalog.service.ts` | Catalog access patterns |
| `packages/ui/src/models/visualization/flows/support/camel-component-schema.service.ts` | Entity/Pattern detection, getProcessorStepsProperties |
| `packages/ui/src/models/camel-properties-common.ts` | `index` field definition |
| `packages/ui/src/models/visualization/flows/visual-entity-sorting.test.ts` | Expected sorting behavior |

---

## Verification Plan

1. **Run existing tests**:
   ```bash
   yarn workspace @kaoto/kaoto run test -- --testPathPattern="visual-entity-sorting" --silent
   ```

2. **Run sorter-specific tests**:
   ```bash
   yarn workspace @kaoto/kaoto run test -- --testPathPattern="camel-component-sorter" --silent
   ```

3. **Manual verification**:
   - Start dev server: `yarn workspace @kaoto/kaoto run start`
   - Load a complex route with nested expressions, choice blocks, etc.
   - Export to YAML and verify property order matches catalog index

---

---

## Model Tree: Generic Traversal Infrastructure

The Model Tree is designed as a **generic base** that can be extended for different domains (Camel, Citrus, etc.). Type safety comes from the concrete implementations.

### Architecture: Generic Base + Domain Implementations

```
┌─────────────────────────────────────────────────────────────────┐
│                    IModelNode<TData, TType>                      │
│                    (Generic Base Interface)                      │
│  - name, path, type, data                                       │
│  - getParent(), getChildren(), getNextSibling()                 │
│  - hasChildren(), isArrayElement()                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ ICamelModelNode  │ │ ICitrusModelNode │ │ ICustomModelNode │
│                  │ │                  │ │                  │
│ CamelNodeType:   │ │ CitrusNodeType:  │ │ CustomNodeType:  │
│ - Entity         │ │ - TestCase       │ │ - ...            │
│ - Eip            │ │ - Action         │ │                  │
│ - Component      │ │ - Container      │ │                  │
│ - Language       │ │ - Endpoint       │ │                  │
│ - Dataformat     │ │ - ...            │ │                  │
│                  │ │                  │ │                  │
│ + isEntity()     │ │ + isTestCase()   │ │                  │
│ + isEip()        │ │ + isAction()     │ │                  │
│ + getUri()       │ │ + getEndpoint()  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Generic Base Interface: `IModelNode`

```typescript
/**
 * Generic Model Node - Base interface for tree traversal
 * TData: The data type this node holds
 * TType: The node type enum (CamelModelNodeType, CitrusModelNodeType, etc.)
 * TCatalog: The catalog entry type (optional)
 */
export interface IModelNode<
  TData = unknown,
  TType extends string = string,
  TCatalog = unknown
> {
  // Identity
  readonly name: string;
  readonly path: string;
  readonly type: TType;

  // Data access
  readonly data: TData;
  readonly catalogEntry?: TCatalog;

  // Navigation
  getParent(): IModelNode<unknown, TType, TCatalog> | undefined;
  getChildren(): IModelNode<unknown, TType, TCatalog>[];
  getNextSibling(): IModelNode<unknown, TType, TCatalog> | undefined;
  getPreviousSibling(): IModelNode<unknown, TType, TCatalog> | undefined;

  // Utility
  hasChildren(): boolean;
  isArrayElement(): boolean;
}
```

### Node Resolver Interface (Strategy Pattern - for Building)

```typescript
/**
 * The resolver knows how to interpret a specific domain's data
 * Each domain (Camel, Citrus) implements its own resolver
 * Used during TREE CONSTRUCTION
 */
export interface INodeResolver<TType extends string, TCatalog> {
  // Determine the node type from name and data
  getNodeType(name: string, data: unknown): TType;

  // Get catalog entry for a node
  getCatalogEntry(name: string, type: TType): TCatalog | undefined;

  // Find child nodes from data
  getChildNodes(name: string, data: Record<string, unknown>, type: TType): Array<{
    name: string;
    data: unknown;
    isArrayElement: boolean;
    index?: number;
  }>;

  // Get properties metadata (from catalog)
  getPropertiesMetadata(catalogEntry: TCatalog): Record<string, { index: number }> | undefined;
}
```

### Visitor Interface (Visitor Pattern - for Operations)

```typescript
/**
 * Visitors perform operations on the tree without modifying the tree structure
 * Each operation (sorting, validation, search) is a separate visitor
 * Used during TREE TRAVERSAL
 */
export interface IModelNodeVisitor<TType extends string, TResult> {
  // Called for each node during traversal
  visit(node: IModelNode<unknown, TType, unknown>): TResult;
}

/**
 * The tree accepts visitors and handles traversal
 */
export interface IModelNode<TData, TType, TCatalog> {
  // ... existing properties ...

  // Accept a visitor (Visitor pattern)
  accept<TResult>(visitor: IModelNodeVisitor<TType, TResult>): TResult;
}
```

### Visitor Implementations

```typescript
// Sorting Visitor - sorts properties at each node
export class SortingVisitor<TType extends string>
  implements IModelNodeVisitor<TType, Record<string, unknown>> {

  visit(node: IModelNode<unknown, TType, unknown>): Record<string, unknown> {
    // 1. Sort this node's properties by catalog index
    const sortedData = this.sortProperties(node);

    // 2. Visit children and merge their sorted results
    for (const child of node.getChildren()) {
      const childResult = child.accept(this);
      // Place sorted child data in correct position
      this.mergeChildResult(sortedData, child.name, childResult, child.isArrayElement());
    }

    return sortedData;
  }
}

// Validation Visitor - validates each node against catalog schema
export class ValidationVisitor<TType extends string>
  implements IModelNodeVisitor<TType, ValidationError[]> {

  visit(node: IModelNode<unknown, TType, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate this node
    errors.push(...this.validateNode(node));

    // Validate children
    for (const child of node.getChildren()) {
      errors.push(...child.accept(this));
    }

    return errors;
  }
}

// Search Visitor - finds nodes matching criteria
export class SearchVisitor<TType extends string>
  implements IModelNodeVisitor<TType, IModelNode<unknown, TType, unknown>[]> {

  constructor(private predicate: (node: IModelNode) => boolean) {}

  visit(node: IModelNode<unknown, TType, unknown>): IModelNode<unknown, TType, unknown>[] {
    const matches: IModelNode<unknown, TType, unknown>[] = [];

    if (this.predicate(node)) {
      matches.push(node);
    }

    for (const child of node.getChildren()) {
      matches.push(...child.accept(this));
    }

    return matches;
  }
}
```

### Pattern Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         Model Tree                               │
├─────────────────────────────────────────────────────────────────┤
│  BUILDING (Strategy Pattern)         OPERATING (Visitor Pattern)│
│  ─────────────────────────────       ───────────────────────────│
│                                                                  │
│  INodeResolver                        IModelNodeVisitor          │
│  ├── getNodeType()                    ├── visit(node)            │
│  ├── getCatalogEntry()                                           │
│  ├── getChildNodes()                  Implementations:           │
│  └── getPropertiesMetadata()          ├── SortingVisitor         │
│                                       ├── ValidationVisitor      │
│  Implementations:                     ├── SearchVisitor          │
│  ├── CamelNodeResolver                └── TransformVisitor       │
│  └── CitrusNodeResolver                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Camel-Specific Implementation

```typescript
// Camel node types
export enum CamelModelNodeType {
  Entity = 'entity',
  Eip = 'eip',
  Component = 'component',
  Language = 'language',
  Dataformat = 'dataformat',
  Loadbalancer = 'loadbalancer',
}

// Camel catalog types
type CamelCatalogEntry = ICamelProcessorDefinition | ICamelComponentDefinition;

// Camel-specific node interface (extends generic)
export interface ICamelModelNode<TData = Record<string, unknown>>
  extends IModelNode<TData, CamelModelNodeType, CamelCatalogEntry> {

  // Camel-specific type guards
  isEntity(): this is ICamelModelNode & { type: CamelModelNodeType.Entity };
  isEip(): this is ICamelModelNode & { type: CamelModelNodeType.Eip };
  isComponent(): this is ICamelModelNode & { type: CamelModelNodeType.Component };
  isLanguage(): this is ICamelModelNode & { type: CamelModelNodeType.Language };
  isDataformat(): this is ICamelModelNode & { type: CamelModelNodeType.Dataformat };

  // Camel-specific utilities
  getUri(): string | undefined;
  getComponentName(): string | undefined;
}

// Camel resolver implementation
export class CamelNodeResolver implements INodeResolver<CamelModelNodeType, CamelCatalogEntry> {
  getNodeType(name: string, data: unknown): CamelModelNodeType {
    if (ENTITY_PROCESSORS.has(name)) return CamelModelNodeType.Entity;
    if (CamelCatalogService.getComponent(CatalogKind.Language, name)) return CamelModelNodeType.Language;
    if (CamelCatalogService.getComponent(CatalogKind.Dataformat, name)) return CamelModelNodeType.Dataformat;
    if (CamelCatalogService.getComponent(CatalogKind.Loadbalancer, name)) return CamelModelNodeType.Loadbalancer;
    return CamelModelNodeType.Eip;
  }

  getCatalogEntry(name: string, type: CamelModelNodeType): CamelCatalogEntry | undefined {
    // Lookup from appropriate catalog based on type
    switch (type) {
      case CamelModelNodeType.Entity:
        return CamelCatalogService.getComponent(CatalogKind.Entity, name);
      case CamelModelNodeType.Language:
        return CamelCatalogService.getComponent(CatalogKind.Language, name);
      // ... etc
    }
  }

  getChildNodes(name: string, data: Record<string, unknown>, type: CamelModelNodeType) {
    // Use catalog to find child properties (steps, when, otherwise, etc.)
    // Returns array of { name, data, isArrayElement }
  }

  getSortableProperties(catalogEntry: CamelCatalogEntry) {
    return catalogEntry?.properties;
  }
}
```

### Factory Functions

```typescript
// Generic factory (used internally)
function createModelTree<TData, TType extends string, TCatalog>(
  name: string,
  data: TData,
  resolver: INodeResolver<TType, TCatalog>
): IModelNode<TData, TType, TCatalog>;

// Camel-specific factory (public API)
export function createCamelModelTree<TData extends Record<string, unknown>>(
  entityName: string,
  data: TData
): ICamelModelNode<TData> {
  return createModelTree(entityName, data, new CamelNodeResolver()) as ICamelModelNode<TData>;
}

// Type-safe factories for specific Camel entities
export function createRouteTree(data: RouteDefinition): ICamelModelNode<RouteDefinition> {
  return createCamelModelTree('route', data);
}

export function createInterceptTree(data: Intercept): ICamelModelNode<Intercept> {
  return createCamelModelTree('intercept', data);
}

// Future: Citrus-specific factory
export function createCitrusModelTree<TData>(
  testName: string,
  data: TData
): ICitrusModelNode<TData> {
  return createModelTree(testName, data, new CitrusNodeResolver()) as ICitrusModelNode<TData>;
}
```

### Example Usage

```typescript
// Camel route - fully typed
const routeTree = createRouteTree(routeDefinition);
routeTree.getChildren().forEach(child => {
  if (child.isEip()) {
    console.log('EIP:', child.name);
    const uri = child.getUri(); // Camel-specific method
  }
});

// Camel intercept - fully typed
const interceptTree = createInterceptTree(interceptDefinition);

// Generic traversal works for any domain
function traverseTree<TType extends string>(node: IModelNode<unknown, TType>) {
  console.log(node.name, node.type);
  node.getChildren().forEach(child => traverseTree(child));
}

// Works with Camel
traverseTree(routeTree);

// Would work with Citrus too
// traverseTree(citrusTree);
```

### Benefits

| Use Case | How Model Tree Helps |
|----------|---------------------|
| **Sorting** | Traverse tree, sort each node's properties by catalog index |
| **Validation** | Walk tree and validate each node against catalog schema |
| **Search** | Find nodes by name, type, or path pattern |
| **Transformation** | Map over tree to transform data structure |
| **Diff/Merge** | Compare two trees for changes |
| **Serialization** | Control output order during YAML/XML generation |

### Relationship to IVisualizationNode

```
┌─────────────────────────────────────────────────────────────────┐
│                     Camel Entity (Raw Data)                      │
│                   { route: { from: { ... } } }                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
         ┌──────────────────┐        ┌──────────────────────┐
         │  ICamelModelNode │        │  IVisualizationNode  │
         │  (Data Model)    │        │  (Visual/Canvas)     │
         │                  │        │                      │
         │  - Traversal     │        │  - Rendering         │
         │  - Sorting       │        │  - Layout            │
         │  - Validation    │        │  - Interactions      │
         │  - Search        │        │  - Placeholders      │
         └──────────────────┘        └──────────────────────┘
```

### Implementation Strategy

The Model Tree will be implemented with **lazy evaluation**:

1. **Root node created immediately** with entity name and data
2. **Children built on-demand** when `getChildren()` is called
3. **Children cached** after first resolution for subsequent calls
4. **Catalog lookup performed once** per node, cached in `catalogEntry`

This approach is memory-efficient (only builds what's needed) and fast for repeated access (caching).

### First Consumer: Sorter

The sorter will use the Model Tree to:
1. Create tree from entity data
2. Traverse tree depth-first
3. Sort each node's properties by catalog index
4. Reconstruct sorted data structure

### Future Consumers

Other features can adopt the Model Tree incrementally:
- **Validation**: Walk tree and validate against catalog schemas
- **Search**: Find nodes by name, type, or path pattern
- **Visualization**: Build `IVisualizationNode` from `ICamelModelNode`

---

## Summary

The architecture keeps sorting logic **clean** (pure functions), **reusable** (each function handles one thing), and **readable** (clear flow from entry to recursion).

Using multiple files provides:
- **Better testability**: Each service can be unit tested in isolation
- **Clear responsibilities**: catalog-lookup, property-sorting, recursive-traversal
- **Easier maintenance**: Changes isolated to specific concerns

The **Model Tree** enhancement would generalize the traversal logic for broader reuse (validation, search, transformation).

It leverages existing patterns from `CamelComponentSchemaService` and `CamelCatalogService` for consistency.
