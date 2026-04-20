# ResizableSplitPanels

A horizontal split-panel layout component with draggable resize handle. Built with Carbon Design System.

## Features

- **Mouse & Keyboard Resize**: Drag handle or use arrow keys
- **Accessible**: Full ARIA support and screen reader announcements
- **Responsive**: Percentage-based widths
- **Carbon Integration**: Uses Carbon Tile and design tokens

## Props

```typescript
interface ResizableSplitPanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number; // Default: 30 (%)
  onResizeStart?: () => void;
  onResize?: (leftWidth: number, rightWidth: number) => void;
  onResizeEnd?: (leftWidth: number, rightWidth: number) => void;
  leftPanelId?: string; // Default: 'left-panel'
  rightPanelId?: string; // Default: 'right-panel'
  leftPanelLabel?: string; // Default: 'Left panel'
  rightPanelLabel?: string; // Default: 'Right panel'
}
```

## Usage

### Basic

```tsx
import { ResizableSplitPanels } from '@kaoto/kaoto';

<ResizableSplitPanels
  leftPanel={<div>Left content</div>}
  rightPanel={<div>Right content</div>}
  defaultLeftWidth={30}
/>;
```

### With Callbacks

```tsx
<ResizableSplitPanels
  leftPanel={<CodeEditor />}
  rightPanel={<Preview />}
  defaultLeftWidth={50}
  onResizeStart={() => console.log('Started')}
  onResize={(left, right) => console.log(`${left}% / ${right}%`)}
  onResizeEnd={(left, right) => console.log('Ended')}
/>
```

### Custom Labels

```tsx
<ResizableSplitPanels
  leftPanel={<CodeEditor />}
  rightPanel={<Preview />}
  leftPanelId="source-editor"
  rightPanelId="live-preview"
  leftPanelLabel="Source code editor"
  rightPanelLabel="Live preview panel"
/>
```

## Keyboard Controls

| Key                  | Action                           |
| -------------------- | -------------------------------- |
| **Tab**              | Focus resize handle              |
| **Arrow Left/Right** | Adjust width by 5%               |
| **Shift + Arrow**    | Adjust width by 10%              |
| **Home**             | Set left panel to minimum (10%)  |
| **End**              | Set left panel to maximum (~90%) |
| **Escape**           | Cancel and restore width         |
| **Enter**            | Complete resize                  |

## Accessibility

- **ARIA**: Handle uses `role="slider"` with proper value attributes
- **Screen Reader**: Live region announces width changes (throttled to 5% intervals)
- **Focus**: Visible focus indicator with `:focus-visible`
- **Semantic HTML**: Panels use `<section>` elements with labels

## Implementation Details

### Width Calculation

```typescript
const MIN_PANEL_WIDTH = 10; // 10% minimum
leftWidth + rightWidth + gapPercent = 100%
```

Gap percentage is calculated from actual DOM elements (CSS as single source of truth).

### Resize Modes

**Mouse Resize:**

1. Mouse down → `onResizeStart()`
2. Mouse move → `onResize(left, right)`
3. Mouse up → `onResizeEnd(left, right)`

**Keyboard Resize:**

1. First arrow key → Save width, `onResizeStart()`
2. Arrow keys → Adjust width, `onResize(left, right)`
3. Enter/Blur → `onResizeEnd(left, right)`
4. Escape → Restore saved width, `onResizeEnd(left, right)`

### Components

**ResizableSplitPanels**: Container managing resize state and events

**SplitPanel**: Individual panel wrapper with Carbon Tile

```typescript
interface SplitPanelProps {
  width: number;
  position: 'left' | 'right';
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
}
```

## Testing

Run tests:

```bash
yarn workspace @kaoto/kaoto test ResizableSplitPanels
```

View in Storybook:

```bash
yarn workspace @kaoto/kaoto-tests storybook
```

## Files

- [`ResizableSplitPanels.tsx`](./ResizableSplitPanels.tsx) - Main component
- [`SplitPanel.tsx`](./SplitPanel.tsx) - Panel wrapper
- [`ResizableSplitPanels.test.tsx`](./ResizableSplitPanels.test.tsx) - Tests
- [`ResizableSplitPanels.scss`](./ResizableSplitPanels.scss) - Styles
