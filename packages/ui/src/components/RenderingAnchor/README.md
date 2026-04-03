# RenderingAnchor System

## Overview

The RenderingAnchor system provides a flexible mechanism for dynamically injecting React components into predefined locations in the UI. This architecture decouples UI elements, allowing components to be registered and rendered conditionally without tight coupling between parent and child components.

## Core Concepts

### 1. Anchor Points
Anchor points are predefined locations in the UI where components can be dynamically rendered. They act as placeholders that can host multiple components based on runtime conditions.

### 2. Component Registration
Components are registered to specific anchor points with an activation function that determines when they should be rendered.

### 3. Conditional Rendering
Each registered component includes an activation function that receives a `IVisualizationNode` and returns a boolean indicating whether the component should render.

## Architecture

### Components

#### `RenderingAnchor`
The anchor component that renders all registered components for a specific anchor tag.

```tsx
<RenderingAnchor anchorTag="CanvasFormHeader" vizNode={currentNode} />
```

**Props:**
- `anchorTag: string` - The identifier for the anchor point
- `vizNode: IVisualizationNode | undefined` - The visualization node context

#### `RenderingProvider`
Context provider that manages component registration and retrieval. Must wrap the application or feature area where anchors are used.

```tsx
<RenderingProvider>
  <YourApp />
</RenderingProvider>
```

#### `RegisterComponents`
Component that registers all dynamic components to their respective anchors. This is where you define which components should be available at which anchor points.

### Context API

#### `RenderingAnchorContext`

**Methods:**

##### `registerComponent(props: IRegisteredComponent): void`
Registers a component to an anchor point.

**Parameters:**
```typescript
interface IRegisteredComponent {
  anchor: string;                                    // Anchor tag identifier
  activationFn: (vizNode: IVisualizationNode) => boolean;  // Condition function
  component: FunctionComponent<{ vizNode?: IVisualizationNode }>;  // React component
}
```

##### `getRegisteredComponents(anchorTag: string, vizNode: IVisualizationNode): IRegisteredValidatedComponent[]`
Retrieves all registered components for an anchor that pass their activation function.

**Returns:**
```typescript
interface IRegisteredValidatedComponent {
  key: string;                                       // Unique key for React rendering
  Component: FunctionComponent<{ vizNode?: IVisualizationNode }>;
}
```

## Usage Guide

### Step 1: Define Anchor Points

Add new anchor identifiers to the `Anchors` enum:

```typescript
// src/components/registers/anchors.ts
export const enum Anchors {
  CanvasFormHeader = 'CanvasFormHeader',
  YourNewAnchor = 'YourNewAnchor',  // Add your anchor here
}
```

### Step 2: Place Anchor in UI

Insert the `RenderingAnchor` component where you want dynamic components to appear:

```tsx
import { RenderingAnchor } from '../RenderingAnchor/RenderingAnchor';
import { Anchors } from '../registers/anchors';

function YourComponent({ vizNode }) {
  return (
    <div>
      <h1>Your Component</h1>
      <RenderingAnchor 
        anchorTag={Anchors.YourNewAnchor} 
        vizNode={vizNode} 
      />
    </div>
  );
}
```

### Step 3: Create Activation Function

Define when your component should be active:

```typescript
// src/components/registers/your-feature.activationfn.ts
import { IVisualizationNode } from '../../models';

export const yourFeatureActivationFn = (vizNode: IVisualizationNode): boolean => {
  // Your logic to determine if component should render
  // Example: check node type, properties, or state
  return vizNode.data.type === 'your-type';
};
```

### Step 4: Register Component

Add your component registration to `RegisterComponents`:

```tsx
// src/components/registers/RegisterComponents.tsx
import { lazy } from 'react';
import { yourFeatureActivationFn } from './your-feature.activationfn';

const componentsToRegister = useRef<IRegisteredComponent[]>([
  // ... existing registrations
  {
    anchor: Anchors.YourNewAnchor,
    activationFn: yourFeatureActivationFn,
    component: lazy(() => import('../YourFeature/YourFeatureComponent')),
  },
]);
```

### Step 5: Create Your Component

Implement your component with the expected props:

```tsx
// src/components/YourFeature/YourFeatureComponent.tsx
import { FunctionComponent } from 'react';
import { IVisualizationNode } from '../../models';

interface IYourFeatureProps {
  vizNode?: IVisualizationNode;
}

const YourFeatureComponent: FunctionComponent<IYourFeatureProps> = ({ vizNode }) => {
  if (!vizNode) return null;
  
  return (
    <div>
      {/* Your component implementation */}
    </div>
  );
};

export default YourFeatureComponent;
```

## Example: Current Implementation

### DataMapper Launcher
Registered to `CanvasFormHeader` anchor, activated when the node supports data mapping:

```typescript
{
  anchor: Anchors.CanvasFormHeader,
  activationFn: datamapperActivationFn,
  component: lazy(() => import('../DataMapper/DataMapperLauncher')),
}
```

### Component Mode
Registered to `CanvasFormHeader` anchor, activated for component mode views:

```typescript
{
  anchor: Anchors.CanvasFormHeader,
  activationFn: componentModeActivationFn,
  component: lazy(() => import('../ComponentMode/ComponentMode')),
}
```

## Best Practices

### 1. Use Lazy Loading
Always use `lazy()` for registered components to enable code splitting:

```typescript
component: lazy(() => import('../YourComponent/YourComponent'))
```

### 2. Specific Activation Functions
Keep activation functions focused and testable:

```typescript
// Good: Specific and testable
export const isDataMapperNode = (vizNode: IVisualizationNode): boolean => {
  return vizNode.data.supportsDataMapping === true;
};

// Avoid: Complex logic in registration
activationFn: (vizNode) => {
  // Multiple conditions, hard to test
  return vizNode.data.type === 'x' && vizNode.data.prop && someGlobalState;
}
```

### 3. Null Safety
Always check for `vizNode` existence in your components:

```typescript
const YourComponent: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  if (!vizNode) return null;
  // ... rest of component
};
```

### 4. Unique Anchor Names
Use descriptive, unique anchor names that indicate their location and purpose:

```typescript
export const enum Anchors {
  CanvasFormHeader = 'CanvasFormHeader',      // Good: Clear location and purpose
  Sidebar = 'Sidebar',                         // Avoid: Too generic
  CanvasSidebarActions = 'CanvasSidebarActions', // Good: Specific location
}
```

### 5. Single Responsibility
Each registered component should have a single, clear purpose. If you need multiple features, register them as separate components.

## Testing

### Testing Activation Functions

```typescript
import { yourFeatureActivationFn } from './your-feature.activationfn';

describe('yourFeatureActivationFn', () => {
  it('should return true when conditions are met', () => {
    const vizNode = createMockVizNode({ type: 'your-type' });
    expect(yourFeatureActivationFn(vizNode)).toBe(true);
  });

  it('should return false when conditions are not met', () => {
    const vizNode = createMockVizNode({ type: 'other-type' });
    expect(yourFeatureActivationFn(vizNode)).toBe(false);
  });
});
```

### Testing with RenderingAnchor

```typescript
import { render } from '@testing-library/react';
import { RenderingAnchorContext } from './rendering.provider';

const mockContext = {
  registerComponent: jest.fn(),
  getRegisteredComponents: jest.fn(() => [
    { key: 'test-key', Component: MockComponent }
  ]),
};

render(
  <RenderingAnchorContext.Provider value={mockContext}>
    <RenderingAnchor anchorTag="TestAnchor" vizNode={mockVizNode} />
  </RenderingAnchorContext.Provider>
);
```

## Troubleshooting

### Component Not Rendering

1. **Check activation function**: Verify it returns `true` for your test case
2. **Verify anchor tag**: Ensure the anchor tag matches between registration and placement
3. **Check provider**: Ensure `RenderingProvider` wraps your component tree
4. **Inspect vizNode**: Verify the `vizNode` prop is passed correctly

### Multiple Components Rendering

This is expected behavior. Multiple components can be registered to the same anchor. They will all render if their activation functions return `true`. To prevent this:

- Make activation functions mutually exclusive
- Use more specific anchor points
- Add priority logic to activation functions

### Performance Issues

- Ensure components are lazy-loaded
- Keep activation functions lightweight
- Avoid expensive computations in activation functions
- Consider memoization for complex activation logic

## Migration Guide

### Adding a New Anchor to Existing Code

1. Add anchor to `Anchors` enum
2. Place `<RenderingAnchor>` in target location
3. Create activation function
4. Register component in `RegisterComponents`
5. Test with different `vizNode` states

### Converting Static Components to Dynamic

Before:
```tsx
<div>
  <Header />
  <StaticComponent />
  <Content />
</div>
```

After:
```tsx
<div>
  <Header />
  <RenderingAnchor anchorTag={Anchors.HeaderActions} vizNode={vizNode} />
  <Content />
</div>
```

Then register `StaticComponent` to the anchor with appropriate activation logic.

## API Reference

### Types

```typescript
interface IVisualizationNode {
  // Node data and methods
  getId(): string;
  data: Record<string, unknown>;
  // ... other properties
}

interface IRegisteredComponent {
  anchor: string;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  component: FunctionComponent<{ vizNode?: IVisualizationNode }>;
}

interface IRegisteredValidatedComponent {
  key: string;
  Component: FunctionComponent<{ vizNode?: IVisualizationNode }>;
}

interface IRenderingAnchorContext {
  registerComponent: (props: IRegisteredComponent) => void;
  getRegisteredComponents: (
    anchorTag: string, 
    vizNode: IVisualizationNode
  ) => IRegisteredValidatedComponent[];
}
```

## Related Files

- `RenderingAnchor.tsx` - Main anchor component
- `rendering.provider.tsx` - Context provider implementation
- `rendering.provider.model.ts` - TypeScript interfaces
- `RegisterComponents.tsx` - Component registration
- `anchors.ts` - Anchor point definitions
- `*.activationfn.ts` - Activation function implementations
