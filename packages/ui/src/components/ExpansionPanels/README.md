# ExpansionPanels Component - Technical Documentation

## Overview

ExpansionPanels is a resizable, collapsible panel container designed for the DataMapper's source/target view. It manages multiple panels that share vertical space, with support for:

- **Expand/Collapse**: Panels can be toggled between expanded and collapsed states
- **Resize**: Users can drag panel borders to resize expanded panels
- **Space redistribution**: When panels expand, collapse, or resize, space is automatically redistributed among other panels
- **Container resize**: When the parent container resizes (window resize), all panels scale proportionally

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ExpansionPanels (Container)                                │
│  ├── CSS Grid layout via --grid-template variable           │
│  ├── ResizeObserver for container resize handling           │
│  └── ExpansionContext.Provider                              │
│       │                                                     │
│       ├── ExpansionPanel (Parameters)   ← order: 0 (first)  │
│       │    ├── summary (header, always visible)             │
│       │    ├── content (children, hidden when collapsed)    │
│       │    └── resize-handle (bottom border)                │
│       │                                                     │
│       └── ExpansionPanel (Body)         ← order: 1000 (last)│
│            ├── summary                                      │
│            ├── content                                      │
│            └── resize-handle                                │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. `ExpansionPanels` (Container)

**Props:**
- `firstPanelId?: string` - ID of panel that should always be first
- `lastPanelId?: string` - ID of panel that should always be last

**Responsibilities:**
- Maintains a `Map<string, PanelData>` of registered panels (in a ref, not state)
- Calculates and applies CSS grid template via `--grid-template` CSS variable
- Handles space redistribution on expand/collapse/resize
- Responds to container resize via `ResizeObserver`

**Key Design Decisions:**
- **Ref-based state**: Panel data stored in `useRef`, not `useState`, to avoid React re-renders during resize. Grid updates happen directly via CSS variable mutation.
- **Order system**: Panels have an `order` field that determines their visual position. `firstPanelId` gets order 0, `lastPanelId` gets order 1000, others get sequential orders based on JSX position.

### 2. `ExpansionPanel` (Individual Panel)

**Props:**
- `id?: string` - Unique identifier (auto-generated if not provided)
- `summary: ReactNode` - Header content (always visible)
- `defaultExpanded?: boolean` - Initial expansion state (default: true)
- `defaultHeight?: number` - Initial height in pixels (default: 300)
- `minHeight?: number` - Minimum height when expanded (default: 100)
- `collapsible?: boolean` - Whether panel can be collapsed (default: true)
- `onScroll?: () => void` - Scroll event handler for content area
- `onLayoutChange?: (id: string) => void` - Called on expand/collapse/resize (used to update mapping lines)

**Responsibilities:**
- Registers itself with parent container on mount
- Manages local expansion state
- Handles mouse-based resize via drag handle
- Triggers `onLayoutChange` callback for mapping line updates

### 3. `PanelData` (Internal State)

```typescript
interface PanelData {
  id: string;
  height: number;           // Current height in pixels
  minHeight: number;        // Minimum height when expanded
  collapsedHeight: number;  // Height when collapsed (header only, ~40-50px)
  element: HTMLDivElement;  // DOM reference
  isExpanded: boolean;      // Expansion state
  order: number;            // Position in layout (lower = higher)
}
```

## Size Calculation Algorithm

### 1. Registration

When a panel registers:
1. Measures `collapsedHeight` from the header element (`expansion-panel__summary`)
2. Preserves existing height/expansion if re-registering (e.g., after prop change)
3. Assigns temporary order, then updates from JSX children order
4. Updates grid template

### 2. Grid Template Calculation

```typescript
const updateGridTemplate = () => {
  // Sort panels by order
  const panels = [...panelsRef.current.values()].sort((a, b) => a.order - b.order);

  // Build template: expanded panels use height, collapsed use collapsedHeight
  const template = panels
    .map(p => p.isExpanded ? `${p.height}px` : `${p.collapsedHeight}px`)
    .join(' ');

  container.style.setProperty('--grid-template', template);
};
```

### 3. Expand/Collapse Space Redistribution

**On Expand:**
```
1. Calculate available space = container height - sum(collapsed panels heights)
2. If other expanded panels exist:
   - Redistribute available space proportionally among ALL expanded panels
3. If this is the only expanded panel:
   - Give it all available space
```

**On Collapse:**
```
1. Calculate freed space = current height - collapsed height
2. Distribute freed space proportionally to other expanded panels
```

### 4. Resize Between Panels

Resize always affects **two panels** (the one being dragged and the one below):

```typescript
const applyConstrainedResize = (current, adjacent, newHeight) => {
  const delta = newHeight - current.height;

  // Constrain delta by both panels' limits
  const maxGrow = adjacent.height - adjacent.minHeight;  // Can't shrink neighbor below min
  const maxShrink = current.height - current.minHeight;  // Can't shrink self below min

  const actualDelta = clamp(delta, -maxShrink, maxGrow);

  current.height += actualDelta;
  adjacent.height -= actualDelta;
};
```

### 5. Container Resize Handling

When the container resizes (window resize, sidebar toggle, etc.):

```
1. Calculate difference between current total and new container height
2. Distribute difference proportionally among EXPANDED panels only
3. Ensure no panel goes below minHeight
4. Give remaining pixels to last expanded panel (for pixel-perfect fit)
```

## Performance Optimizations

1. **Ref-based panel storage**: Avoids React re-renders during drag operations
2. **CSS variable updates**: Direct DOM manipulation instead of state changes
3. **requestAnimationFrame loop**: 60fps mapping line updates during resize
4. **Microtask scheduling**: `queueMicrotask()` for predictable order updates

## Integration with DataMapper

The DataMapper uses `onLayoutChange` callbacks to trigger `batchUpdateConnectionPorts()`:
- Queries all visible connection port elements from the DOM
- Updates the Zustand store with new port positions in a single batch
- `MappingLinksContainer` reactively recalculates line coordinates from stored positions

## CSS Structure

```scss
.expansion-panels {
  display: grid;
  grid-template-rows: var(--grid-template);  // Dynamic from JS
  height: 100%;
  overflow: hidden;
}

.expansion-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &[data-expanded="false"] .expansion-panel__content {
    display: none;
  }
}
```