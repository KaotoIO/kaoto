# ResizableSplitPanels Component - Technical Documentation

## Overview

ResizableSplitPanels is a horizontal split-panel layout component that allows users to resize two side-by-side panels by dragging a handle between them. Built with Carbon Design System components and tokens, it provides:

- **Horizontal Split Layout**: Two panels arranged side-by-side
- **Interactive Resize**: Drag handle between panels to adjust widths
- **Responsive Design**: Panels maintain percentage-based widths
- **Carbon Integration**: Uses Carbon Tile components and design tokens

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ResizableSplitPanels (Container)                           │
│  ├── Flexbox layout with percentage-based widths            │
│  ├── Mouse event handling for resize                        │
│  └── Callback system for resize events                      │
│       │                                                      │
│       ├── SplitPanel (Left)                                 │
│       │    ├── Carbon Tile wrapper                          │
│       │    ├── Width: calculated percentage                 │
│       │    └── Content: user-provided ReactNode             │
│       │                                                      │
│       ├── Resize Handle (Button)                            │
│       │    ├── Carbon ArrowsHorizontal icon                 │
│       │    ├── Draggable with mouse events                  │
│       │    └── Visual feedback on hover/active              │
│       │                                                      │
│       └── SplitPanel (Right)                                │
│            ├── Carbon Tile wrapper                          │
│            ├── Width: calculated percentage                 │
│            └── Content: user-provided ReactNode             │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. `ResizableSplitPanels` (Container)

**Props:**

```typescript
interface ResizableSplitPanelsProps {
  leftPanel: ReactNode; // Content for left panel
  rightPanel: ReactNode; // Content for right panel
  defaultLeftWidth?: number; // Initial left panel width % (default: 30)
  onResizeStart?: () => void; // Called when resize begins
  onResize?: (leftWidth: number, rightWidth: number) => void; // Called during resize
  onResizeEnd?: (leftWidth: number, rightWidth: number) => void; // Called when resize ends
}
```

**Responsibilities:**

- Manages panel width state (percentage-based)
- Handles mouse events for resize interaction
- Calculates gap percentage from resize handle dimensions
- Ensures total width (left + right + gap) = 100%
- Provides resize callbacks for parent components

**Key Design Decisions:**

- **Percentage-based widths**: Panels use percentages for responsive behavior
- **Gap calculation**: Dynamically calculates gap from CSS (single source of truth)
- **Global mouse events**: Attaches to document for smooth dragging outside component
- **Constrained resizing**: Enforces MIN_PANEL_WIDTH (10%) for both panels

### 2. `SplitPanel` (Individual Panel)

**Props:**

```typescript
interface SplitPanelProps {
  width: number; // Width percentage (10-90)
  position: 'left' | 'right'; // Panel position
  children: ReactNode; // Panel content
}
```

**Responsibilities:**

- Wraps content in Carbon Tile component
- Applies width constraints (10% min, 90% max)
- Provides consistent styling and overflow handling
- Adds position-specific CSS classes

**Key Features:**

- **Carbon Tile wrapper**: Ensures consistent Carbon styling
- **Width constraints**: Prevents panels from becoming too small/large
- **Overflow handling**: Content scrolls independently in each panel

## Resize Algorithm

### 1. Initialization

```typescript
// Calculate gap from actual DOM elements (CSS is source of truth)
const getGapPercent = (container, handle) => {
  const gapPx = handle.width + handle.marginLeft + handle.marginRight + borders;
  return (gapPx / container.offsetWidth) * 100;
};

// Initial state
leftWidth = defaultLeftWidth; // e.g., 30%
gapPercent = getGapPercent(); // e.g., 4.2%
rightWidth = 100 - leftWidth - gapPercent; // e.g., 65.8%
```

### 2. Resize Interaction

**On Mouse Down:**

```typescript
1. Set isResizing = true
2. Store startX (mouse position)
3. Store startLeftWidth (current left panel width)
4. Call onResizeStart callback
5. Add data-resizing attribute (disables text selection)
```

**On Mouse Move:**

```typescript
1. Calculate deltaX = currentX - startX
2. Convert to percentage: deltaPercent = (deltaX / containerWidth) * 100
3. Calculate new left width: newLeftWidth = startLeftWidth + deltaPercent
4. Constrain to valid range:
   - Min: MIN_PANEL_WIDTH (10%)
   - Max: 100 - gapPercent - MIN_PANEL_WIDTH
5. Update leftWidth state
6. Calculate rightWidth = 100 - leftWidth - gapPercent
7. Call onResize callback with new widths
```

**On Mouse Up:**

```typescript
1. Set isResizing = false
2. Remove data-resizing attribute
3. Call onResizeEnd callback with final widths
4. Remove global mouse event listeners
```

### 3. Width Constraints

```typescript
const MIN_PANEL_WIDTH = 10; // 10% minimum for each panel

// Left panel constraints
minLeftWidth = MIN_PANEL_WIDTH;
maxLeftWidth = 100 - gapPercent - MIN_PANEL_WIDTH;

// Right panel constraints (automatic)
rightWidth = 100 - leftWidth - gapPercent;
```

## Carbon Design System Integration

### Design Tokens Used

**Spacing:**

```scss
--resize-handle-width: $spacing-05; // 16px
--resize-handle-margin: $spacing-03; // 8px
```

**Colors:**

```scss
border-left: 1px solid $border-subtle;
border-right: 1px solid $border-subtle;
```

**Motion:**

```scss
transition: opacity motion(standard, productive);
```

**Components:**

- `Tile` from `@carbon/react` - Panel wrapper
- `ArrowsHorizontal` from `@carbon/icons-react` - Resize handle icon

### Theme Compatibility

The component automatically adapts to all Carbon themes:

- **white** - Light theme with white background
- **g10** - Light theme with subtle gray background
- **g90** - Dark theme with dark gray background
- **g100** - Darkest theme with black background

All colors use Carbon theme tokens, ensuring proper contrast and visual consistency across themes.

## Usage Examples

### Basic Usage

```tsx
import { ResizableSplitPanels } from '@kaoto/kaoto';

function MyComponent() {
  return (
    <ResizableSplitPanels
      leftPanel={<div>Left content</div>}
      rightPanel={<div>Right content</div>}
      defaultLeftWidth={30}
    />
  );
}
```

### With Callbacks

```tsx
function MyComponent() {
  const [leftWidth, setLeftWidth] = useState(30);
  const [rightWidth, setRightWidth] = useState(70);

  return (
    <ResizableSplitPanels
      leftPanel={<div>Left: {leftWidth.toFixed(1)}%</div>}
      rightPanel={<div>Right: {rightWidth.toFixed(1)}%</div>}
      defaultLeftWidth={30}
      onResizeStart={() => console.log('Resize started')}
      onResize={(left, right) => {
        setLeftWidth(left);
        setRightWidth(right);
      }}
      onResizeEnd={(left, right) => {
        console.log(`Final: ${left}% / ${right}%`);
      }}
    />
  );
}
```

### Code Editor Layout

```tsx
function CodeEditor() {
  return (
    <ResizableSplitPanels
      leftPanel={<CodeSnippet type="multi">{sourceCode}</CodeSnippet>}
      rightPanel={<Preview />}
      defaultLeftWidth={50}
    />
  );
}
```

### Sidebar Navigation

```tsx
function AppLayout() {
  return <ResizableSplitPanels leftPanel={<NavigationSidebar />} rightPanel={<MainContent />} defaultLeftWidth={20} />;
}
```

## Performance Considerations

1. **Ref-based state**: Uses refs for mouse position tracking to avoid unnecessary re-renders
2. **Direct DOM updates**: Updates widths via state, but reads dimensions from DOM
3. **Event cleanup**: Properly removes global event listeners on unmount
4. **Constrained calculations**: Clamps values to prevent invalid states

## CSS Structure

```scss
.resizable-split-panels {
  display: flex;
  width: 100%;
  height: 100%;

  .resize-handle {
    width: $spacing-05;
    margin: 0 $spacing-03;
    border-left: 1px solid $border-subtle;
    border-right: 1px solid $border-subtle;
    cursor: col-resize;

    svg {
      opacity: 0.6;
      transition: opacity motion(standard, productive);
    }

    &:hover svg {
      opacity: 1;
    }
  }

  &[data-resizing] {
    user-select: none;
    cursor: col-resize;
  }
}

.split-panel {
  display: flex;
  flex-direction: column;
  height: 100%;

  > div {
    // Carbon Tile
    height: 100%;
    overflow: auto;
  }
}
```

## Testing

The component includes comprehensive tests covering:

- Resize handle rendering and styling
- Complete resize lifecycle (mousedown, mousemove, mouseup)
- Width calculations and constraints
- Callback invocations
- Edge cases (window resize, mouse leave, rapid movements)
- Dynamic content updates
- Event listener cleanup

See `ResizableSplitPanels.test.tsx` and `SplitPanel.test.tsx` for full test coverage.

## Storybook Documentation

Interactive examples available in Storybook:

- Basic two-panel layout
- Integration with Carbon components
- Code editor/preview pattern
- Sidebar navigation pattern
- Scrollable content handling
- Event callback demonstration

Run `yarn workspace @kaoto/kaoto-tests storybook` to view examples.
