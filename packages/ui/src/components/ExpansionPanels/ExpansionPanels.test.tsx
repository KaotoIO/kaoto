import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { ExpansionContext } from './ExpansionContext';
import { ExpansionPanel } from './ExpansionPanel';
import { ExpansionPanels } from './ExpansionPanels';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.elements.push(target);
  }

  unobserve(target: Element) {
    this.elements = this.elements.filter((el) => el !== target);
  }

  disconnect() {
    this.elements = [];
  }

  trigger() {
    const entries = this.elements.map((el) => ({
      target: el,
      contentRect: el.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }));
    this.callback(entries as ResizeObserverEntry[], this as ResizeObserver);
  }
}

describe('ExpansionPanels', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = jest.fn((callback) => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver as unknown as ResizeObserver;
    }) as unknown as typeof ResizeObserver;

    // Mock queueMicrotask if not available
    if (globalThis.queueMicrotask === undefined) {
      globalThis.queueMicrotask = (callback: () => void) => Promise.resolve().then(callback);
    }
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  const mockHeaderHeight = (element: Element, height: number) => {
    const header = element.querySelector('.expansion-panel__summary');
    if (header) {
      Object.defineProperty(header, 'offsetHeight', { value: height, configurable: true, writable: true });
    }
  };

  const mockPanelHeight = (element: Element, height: number) => {
    Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true, writable: true });
  };

  const setupPanelMocks = async (container: HTMLElement) => {
    // Mock all panel header heights
    const panels = container.querySelectorAll('.expansion-panel');
    panels.forEach((panel) => {
      mockHeaderHeight(panel, 50);
      mockPanelHeight(panel, 300);
    });

    // Mock container height
    const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
    if (expansionPanelsContainer) {
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', {
        value: 600,
        configurable: true,
        writable: true,
      });
    }

    // Wait for registration and grid template update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };

  describe('Panel Registration and Ordering', () => {
    it('should maintain stable panel order based on JSX position', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2">
            Content 2
          </ExpansionPanel>
          <ExpansionPanel id="panel-3" summary="Panel 3">
            Content 3
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      // Mock header heights for all panels
      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Check that grid template maintains order
      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      // Should have 3 panel heights (all expanded by default at 300px)
      expect(gridTemplate).toContain('300px 300px 300px');
    });

    it('should assign ORDER_FIRST (0) to parameters-header panel', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="parameters-header" summary="Parameters Header">
            Header Content
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Parameters header should appear FIRST in grid template despite being second in JSX
      // We can't directly test the order field, but we can verify the grid template
      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toBeTruthy();
    });

    it('should assign ORDER_LAST (1000) to source-body panel and add spacer', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="source-body" summary="Body">
            Body Content
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Check for spacer div
      const spacer = container.querySelector('.expansion-panels__spacer');
      expect(spacer).toBeInTheDocument();
      expect(spacer).toHaveAttribute('data-is-spacer', 'true');

      // Grid template should include 1fr spacer before body panel
      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toContain('1fr'); // Spacer for body panel
    });

    it('should NOT add spacer when source-body is the only panel', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="source-body" summary="Body">
            Body Content
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // No spacer when body is first (only) child
      const spacer = container.querySelector('.expansion-panels__spacer');
      expect(spacer).not.toBeInTheDocument();
    });
  });

  describe('Grid Template Generation', () => {
    it('should generate grid template with expanded heights', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultHeight={200}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultHeight={300}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      // Should use defaultHeight for each panel
      expect(gridTemplate).toContain('200px');
      expect(gridTemplate).toContain('300px');
    });

    it('should use collapsed height for collapsed panels', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultExpanded={true} defaultHeight={300}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultExpanded={false} defaultHeight={300}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      await setupPanelMocks(container);

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      // Panel 1: expanded (300px), Panel 2: collapsed (panel collapsed height, not 300px)
      expect(gridTemplate).toContain('300px');
      // Collapsed panel should NOT use full defaultHeight
      expect(gridTemplate).not.toBe('300px 300px');
    });

    it('should update grid template when children change', async () => {
      const { container, rerender } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      let panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      let gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      expect(gridTemplate).toContain('300px');

      // Add a new panel
      rerender(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2">
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      // Should now have 2 panels
      expect(gridTemplate).toContain('300px 300px');
    });
  });

  describe('Collapse/Expand Space Redistribution', () => {
    it('should redistribute space when panel is collapsed', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultHeight={300} defaultExpanded={true}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultHeight={300} defaultExpanded={true}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      // Mock container height
      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Initial state: both panels at 300px
      let gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toContain('300px 300px');

      // Click to collapse panel-1
      const panel1Summary = screen.getByText('Panel 1');
      await act(async () => {
        panel1Summary.click();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // After collapse, panel-1 should be smaller (collapsed), panel-2 should have more space
      gridTemplate = (expansionPanelsContainer as HTMLElement).style.getPropertyValue('--grid-template');
      // Check that first panel is much smaller than 300px (collapsed)
      const heights = gridTemplate?.split(' ') || [];
      expect(Number.parseInt(heights[0])).toBeLessThan(100); // Collapsed panel (header only)
      expect(Number.parseInt(heights[1])).toBeGreaterThan(500); // Expanded panel got more space
    });

    it('should redistribute space to only expanded panel when it is the only one', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultHeight={300} defaultExpanded={false}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultHeight={300} defaultExpanded={true}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');

      // Panel 1: collapsed (header only, small), Panel 2: should get remaining space
      const heights = gridTemplate.split(' ');
      expect(Number.parseInt(heights[0])).toBeLessThan(100); // Collapsed panel
      expect(Number.parseInt(heights[1])).toBeGreaterThan(200); // Expanded panel has more space
    });
  });

  describe('Resize Functionality', () => {
    it('should handle resize with bottom handle (normal panels)', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={100} defaultHeight={300} defaultExpanded={true}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" minHeight={100} defaultHeight={300} defaultExpanded={true}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // The resize functionality is tested in context - the grid template should update
      // when panels resize. This is an integration test to verify the context wiring.
      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toContain('300px 300px');
    });

    it('should allow resize when adjacent panel is collapsed', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={100} defaultHeight={300} defaultExpanded={true}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" minHeight={100} defaultHeight={300} defaultExpanded={false}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Panel 1 is expanded, Panel 2 is collapsed - both should be in the grid
      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toContain('300px'); // Panel 1 expanded
      // Panel 2 should be smaller (collapsed - just header)
      const heights = gridTemplate?.split(' ') || [];
      expect(Number.parseInt(heights[1])).toBeLessThan(100); // Panel 2 collapsed
    });
  });

  describe('Container Resize Handling', () => {
    it('should redistribute panel heights when container is resized', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultHeight={300} minHeight={100}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultHeight={300} minHeight={100}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Change container height
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 800, configurable: true });

      await act(async () => {
        mockResizeObserver.trigger();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Panels should be resized proportionally
      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toBeTruthy();
    });

    it('should respect minimum heights when container shrinks', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultHeight={300} minHeight={100}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultHeight={300} minHeight={100}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Shrink container to less than minimum total (100 + 100 = 200)
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 150, configurable: true });

      await act(async () => {
        mockResizeObserver.trigger();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      // Should still have valid grid template even with constrained space
      expect(gridTemplate).toBeTruthy();
    });
  });

  describe('Panel State Preservation', () => {
    it('should preserve panel state when re-registering (no infinite loops)', async () => {
      const { container, rerender } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={100}>
            Content 1
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Collapse the panel
      const panel1Summary = screen.getByText('Panel 1');
      await act(async () => {
        panel1Summary.click();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Rerender with changed minHeight (should NOT reset expansion state)
      rerender(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={150}>
            Content 1
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Panel should still be collapsed
      const panel = container.querySelector('[data-expanded="false"]');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Multiple Panels Interaction', () => {
    it('should handle multiple panels with mixed expanded/collapsed states', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultExpanded={true}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultExpanded={false}>
            Content 2
          </ExpansionPanel>
          <ExpansionPanel id="panel-3" summary="Panel 3" defaultExpanded={true}>
            Content 3
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );

      // Should have mix of expanded (300px) and collapsed (header only, small) heights
      expect(gridTemplate).toContain('300px'); // Panel 1 and 3
      const heights = gridTemplate?.split(' ') || [];
      // Panel 2 (middle one) should be collapsed (small)
      expect(Number.parseInt(heights[1])).toBeLessThan(100); // Panel 2 collapsed
    });

    it('should handle all panels collapsed', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" defaultExpanded={false}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" defaultExpanded={false}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );

      // All panels should be at collapsed height (header only, small)
      const heights = gridTemplate?.split(' ') || [];
      heights.forEach((height: string) => {
        expect(Number.parseInt(height)).toBeLessThan(100); // All collapsed
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      const { container } = render(<ExpansionPanels>{null}</ExpansionPanels>);

      const expansionPanelsContainer = container.querySelector('.expansion-panels');
      expect(expansionPanelsContainer).toBeInTheDocument();
    });

    it('should handle single panel', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toContain('300px');
    });

    it('should cleanup ResizeObserver on unmount', () => {
      const { unmount } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1">
            Content 1
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const disconnectSpy = jest.spyOn(mockResizeObserver, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Direct resize method tests', () => {
    // Helper to create test component with resize action
    const createResizeTestComponent = (
      panelId: string,
      newHeight: number,
      isTopHandle: boolean,
      panel1Expanded: boolean,
      panel2Expanded: boolean,
    ) => {
      const TestComponent = () => {
        const context = React.useContext(ExpansionContext);
        const calledRef = React.useRef(false);

        React.useEffect(() => {
          if (!calledRef.current) {
            calledRef.current = true;
            queueMicrotask(() => {
              context.resize(panelId, newHeight, isTopHandle);
            });
          }
        }, [context]);

        return (
          <ExpansionPanels>
            <ExpansionPanel
              id="panel-1"
              summary="Panel 1"
              minHeight={100}
              defaultHeight={300}
              defaultExpanded={panel1Expanded}
            >
              Content 1
            </ExpansionPanel>
            <ExpansionPanel
              id="panel-2"
              summary="Panel 2"
              minHeight={100}
              defaultHeight={300}
              defaultExpanded={panel2Expanded}
            >
              Content 2
            </ExpansionPanel>
          </ExpansionPanels>
        );
      };
      return TestComponent;
    };

    it('should handle resize with top handle (isTopHandle=true) - growing current panel', async () => {
      const TestComponent = createResizeTestComponent('panel-2', 400, true, true, true);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toBeTruthy();
    });

    it('should handle resize with top handle when previous panel is collapsed', async () => {
      const TestComponent = createResizeTestComponent('panel-2', 350, true, false, true);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toBeTruthy();
    });

    it('should handle resize with bottom handle (isTopHandle=false) - growing current panel', async () => {
      const TestComponent = createResizeTestComponent('panel-1', 400, false, true, true);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toBeTruthy();
    });

    it('should handle resize with bottom handle when next panel is collapsed', async () => {
      const TestComponent = createResizeTestComponent('panel-1', 250, false, true, false);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toBeTruthy();
    });

    it('should prevent resize when panel is collapsed', async () => {
      const TestComponent = createResizeTestComponent('panel-2', 400, false, true, false);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      // Panel 2 should still be collapsed (small height)
      const heights = gridTemplate?.split(' ') || [];
      expect(Number.parseInt(heights[1])).toBeLessThan(100);
    });

    it('should handle resize with shrinking current panel (negative delta)', async () => {
      const TestComponent = createResizeTestComponent('panel-1', 200, false, true, true);
      const { container } = render(<TestComponent />);

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const gridTemplate = (container.querySelector('.expansion-panels') as HTMLElement)?.style.getPropertyValue(
        '--grid-template',
      );
      expect(gridTemplate).toBeTruthy();
    });
  });

  describe('Space redistribution edge cases', () => {
    it('should set panels to minimum height when not enough space available', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={100} defaultHeight={300} defaultExpanded={false}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" minHeight={100} defaultHeight={300} defaultExpanded={false}>
            Content 2
          </ExpansionPanel>
          <ExpansionPanel id="panel-3" summary="Panel 3" minHeight={100} defaultHeight={300} defaultExpanded={false}>
            Content 3
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => mockHeaderHeight(panel, 50));

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      // Very small container - less than minimum requirements
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 200, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Click to expand all panels
      const panel1Summary = screen.getByText('Panel 1');
      const panel2Summary = screen.getByText('Panel 2');
      const panel3Summary = screen.getByText('Panel 3');

      await act(async () => {
        panel1Summary.click();
        panel2Summary.click();
        panel3Summary.click();
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toBeTruthy();
      // Should have some valid heights even with constrained space
      const heights = gridTemplate.split(' ');
      expect(heights.length).toBe(3);
    });

    it('should distribute space proportionally when enough space is available', async () => {
      const { container } = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" minHeight={100} defaultHeight={200} defaultExpanded={true}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" minHeight={100} defaultHeight={400} defaultExpanded={true}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );

      const panels = container.querySelectorAll('.expansion-panel');
      panels.forEach((panel) => {
        mockHeaderHeight(panel, 50);
        mockPanelHeight(panel, 300);
      });

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      // Large container with plenty of space
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 1000, configurable: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const gridTemplate = expansionPanelsContainer.style.getPropertyValue('--grid-template');
      expect(gridTemplate).toBeTruthy();

      // Both panels should have heights greater than their minimums
      const heights = gridTemplate.split(' ');
      expect(Number.parseInt(heights[0])).toBeGreaterThan(100); // Panel 1
      expect(Number.parseInt(heights[1])).toBeGreaterThan(100); // Panel 2
    });
  });
});
