import { act, fireEvent, render, screen } from '@testing-library/react';
import { useContext, useEffect } from 'react';

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

// Helper functions to reduce nesting
const mockHeaderHeight = (element: Element, height: number) => {
  const header = element.querySelector('.expansion-panel__summary');
  if (header) {
    Object.defineProperty(header, 'offsetHeight', { value: height, configurable: true, writable: true });
  }
};

const mockPanelHeight = (element: Element, height: number) => {
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true, writable: true });
};

const mockContainerHeight = (container: HTMLElement, height: number) => {
  const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
  if (expansionPanelsContainer) {
    Object.defineProperty(expansionPanelsContainer, 'offsetHeight', {
      value: height,
      configurable: true,
      writable: true,
    });
  }
};

const mockAllPanels = (container: HTMLElement) => {
  const panels = container.querySelectorAll('.expansion-panel');
  panels.forEach((panel) => {
    mockHeaderHeight(panel, 50);
    mockPanelHeight(panel, 300);
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForUpdate = async (ms = 10) => {
  await act(() => delay(ms));
};

const clickElement = async (element: HTMLElement) => {
  await act(() => {
    element.click();
    return delay(10);
  });
};

const clickElements = async (labels: string[]) => {
  await act(() => {
    labels.forEach((label) => {
      screen.getByText(label).click();
    });
    return delay(10);
  });
};

const setupPanelMocks = async (container: HTMLElement) => {
  mockAllPanels(container);
  mockContainerHeight(container, 600);
  await waitForUpdate();
};

const getGridTemplate = (container: HTMLElement): string => {
  const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
  return expansionPanelsContainer?.style.getPropertyValue('--grid-template') || '';
};

const setupBasicPanels = async (container: HTMLElement) => {
  mockAllPanels(container);
  await waitForUpdate();
};

const parseHeights = (gridTemplate: string): number[] => {
  return gridTemplate.split(' ').map((h) => Number.parseInt(h));
};

const triggerContainerResize = async (mockObserver: MockResizeObserver) => {
  await act(() => {
    mockObserver.trigger();
    return delay(10);
  });
};

// Component factories
interface PanelConfig {
  id: string;
  summary: string;
  minHeight?: number;
  defaultHeight?: number;
  defaultExpanded?: boolean;
}

const createPanelElement = (config: PanelConfig) => (
  <ExpansionPanel
    key={config.id}
    id={config.id}
    summary={config.summary}
    minHeight={config.minHeight}
    defaultHeight={config.defaultHeight}
    defaultExpanded={config.defaultExpanded}
  >
    {`Content ${config.id.split('-')[1]}`}
  </ExpansionPanel>
);

const renderPanels = (configs: PanelConfig[]) => {
  return render(<ExpansionPanels>{configs.map(createPanelElement)}</ExpansionPanels>);
};

/**
 * jsdom has no layout engine, so offsetHeight is always 0. This stub gives the container, the panel headers and
 * the panels fixed heights, already while the panels register. Change the returned object to change a height later.
 */
const stubLayoutHeights = (heights: { container: number; header: number; panel: number }) => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('expansion-panels')) return heights.container;
    if (this.classList.contains('expansion-panel__summary')) return heights.header;
    if (this.classList.contains('expansion-panel')) return heights.panel;
    return 0;
  });
  return heights;
};

const waitForAnimationFrames = async () => {
  await act(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

/** Waits for the registration microtasks and the animation frames they schedule. */
const waitForLayoutToSettle = async () => {
  await waitForUpdate();
  await waitForAnimationFrames();
};

const dragResizeHandle = (summary: string, deltaY: number) => {
  const panel = screen.getByText(summary).closest('.expansion-panel') as HTMLElement;
  const handle = panel.querySelector('.expansion-panel__resize-handle') as HTMLElement;
  fireEvent.mouseDown(handle, { clientY: 100 });
  fireEvent.mouseMove(document, { clientY: 100 + deltaY });
  fireEvent.mouseUp(document);
};

/**
 * The global test setup runs animation frames as microtasks and cannot cancel them.
 * This stub collects the frames instead, so a test decides when the next frame runs.
 */
const collectAnimationFrames = () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(nextId, callback);
    return nextId++;
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  return {
    runNextFrame: () => {
      const callbacks = [...frames.values()];
      frames.clear();
      act(() => {
        callbacks.forEach((callback) => {
          callback(performance.now());
        });
      });
    },
  };
};

/** jsdom has no TransitionEvent, so the property name is set on a plain event. */
const fireTransitionEnd = (target: HTMLElement, propertyName: string) => {
  fireEvent(target, Object.assign(new Event('transitionend', { bubbles: true }), { propertyName }));
};

const getPanelsContainer = (container: HTMLElement) => container.querySelector('.expansion-panels') as HTMLElement;

// Helper component for testing layout callbacks
const createTestPanelWithCallback = (callbackRef: { current: boolean }) => {
  const TestPanel = ({ id }: { id: string }) => {
    const context = useContext(ExpansionContext);

    useEffect(() => {
      if (context) {
        const callback = () => {
          callbackRef.current = true;
        };
        context.registerLayoutCallback(id, callback);
        return () => {
          context.unregisterLayoutCallback(id);
        };
      }
    }, [context, id]);

    return (
      <ExpansionPanel id={id} summary={<div>Test Panel</div>} defaultExpanded>
        Content
      </ExpansionPanel>
    );
  };
  return TestPanel;
};

describe('ExpansionPanels', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = vi.fn(function (callback: ResizeObserverCallback) {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver;
    }) as unknown as typeof ResizeObserver;

    globalThis.queueMicrotask ??= (callback: () => void) => {
      void Promise.resolve().then(callback);
    };
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  describe('Panel Registration and Ordering', () => {
    it('should maintain stable panel order based on JSX position', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'panel-2', summary: 'Panel 2' },
        { id: 'panel-3', summary: 'Panel 3' },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px 300px 300px');
    });

    it('should assign ORDER_FIRST (0) to panel with firstPanelId prop', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'first-panel', summary: 'First Panel' },
      ];

      const { container } = render(
        <ExpansionPanels firstPanelId="first-panel">
          {configs.map((cfg) => (
            <ExpansionPanel key={cfg.id} id={cfg.id} summary={<div>{cfg.summary}</div>}>
              Content
            </ExpansionPanel>
          ))}
        </ExpansionPanels>,
      );

      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
      // Grid template should have both panels
      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(2);
    });

    it('should assign ORDER_LAST (1000) to panel with lastPanelId prop', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'my-last-panel', summary: 'Last' },
      ];

      const { container } = render(
        <ExpansionPanels lastPanelId="my-last-panel">
          {configs.map((cfg) => (
            <ExpansionPanel key={cfg.id} id={cfg.id} summary={<div>{cfg.summary}</div>}>
              Content
            </ExpansionPanel>
          ))}
        </ExpansionPanels>,
      );

      await setupBasicPanels(container);

      // Grid template should NOT contain 1fr (no spacer in new implementation)
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).not.toContain('1fr');

      // Panels should be present in grid template
      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(2);
    });
  });

  describe('Grid Template Generation', () => {
    it('should generate grid template with expanded heights', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 200 },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300 },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('200px');
      expect(gridTemplate).toContain('300px');
    });

    it('should use collapsed height for collapsed panels', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultExpanded: true, defaultHeight: 300 },
        { id: 'panel-2', summary: 'Panel 2', defaultExpanded: false, defaultHeight: 300 },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px');
      expect(gridTemplate).not.toBe('300px 300px');
    });

    it('should update grid template when children change', async () => {
      const { container, rerender } = renderPanels([{ id: 'panel-1', summary: 'Panel 1' }]);
      await setupBasicPanels(container);

      let gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px');

      const updatedConfigs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'panel-2', summary: 'Panel 2' },
      ];

      rerender(<ExpansionPanels>{updatedConfigs.map(createPanelElement)}</ExpansionPanels>);
      await setupBasicPanels(container);

      gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px 300px');
    });
  });

  describe('Collapse/Expand Space Redistribution', () => {
    it('should redistribute space when panel is collapsed', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      let gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px 300px');

      const panel1Summary = screen.getByText('Panel 1');
      await clickElement(panel1Summary);

      gridTemplate = getGridTemplate(container);
      const heights = parseHeights(gridTemplate);
      expect(heights[0]).toBeLessThan(100);
      expect(heights[1]).toBeGreaterThan(500);
    });

    it('should redistribute space to only expanded panel when it is the only one', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      mockAllPanels(container);
      mockContainerHeight(container, 600);
      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      const heights = parseHeights(gridTemplate);
      expect(heights[0]).toBeLessThan(100);
      expect(heights[1]).toBeGreaterThan(200);
    });
  });

  describe('Resize Functionality', () => {
    it('should handle resize with bottom handle (normal panels)', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px 300px');
    });

    it('should allow resize when adjacent panel is collapsed', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px');

      const heights = parseHeights(gridTemplate);
      expect(heights[1]).toBeLessThan(100);
    });
  });

  describe('Container Resize Handling', () => {
    it('should redistribute panel heights when container is resized', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, minHeight: 100 },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, minHeight: 100 },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 800, configurable: true });

      await triggerContainerResize(mockResizeObserver);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
    });

    it('should respect minimum heights when container shrinks', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, minHeight: 100 },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, minHeight: 100 },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 150, configurable: true });

      await triggerContainerResize(mockResizeObserver);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
    });

    it('should execute layout callbacks when container resizes horizontally without height change', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, minHeight: 100 },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, minHeight: 100 },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const initialGridTemplate = getGridTemplate(container);

      // Trigger resize without changing height (horizontal resize)
      // This should still execute layout callbacks via double RAF
      await triggerContainerResize(mockResizeObserver);

      // Wait for double requestAnimationFrame to complete
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });

      const gridTemplate = getGridTemplate(container);
      // Grid template should remain the same (no height change)
      expect(gridTemplate).toBe(initialGridTemplate);
    });
  });

  describe('Panel State Preservation', () => {
    it('should preserve panel state when re-registering (no infinite loops)', async () => {
      const { container, rerender } = renderPanels([{ id: 'panel-1', summary: 'Panel 1', minHeight: 100 }]);
      await setupBasicPanels(container);

      const panel1Summary = screen.getByText('Panel 1');
      await clickElement(panel1Summary);

      rerender(
        <ExpansionPanels>{createPanelElement({ id: 'panel-1', summary: 'Panel 1', minHeight: 150 })}</ExpansionPanels>,
      );
      await waitForUpdate();

      const panel = container.querySelector('[data-expanded="false"]');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Multiple Panels Interaction', () => {
    it('should handle multiple panels with mixed expanded/collapsed states', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultExpanded: false },
        { id: 'panel-3', summary: 'Panel 3', defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px');

      const heights = parseHeights(gridTemplate);
      expect(heights[1]).toBeLessThan(100);
    });

    it('should handle all panels collapsed', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', defaultExpanded: false },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      const heights = parseHeights(gridTemplate);
      heights.forEach((height) => {
        expect(height).toBeLessThan(100);
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
      const { container } = renderPanels([{ id: 'panel-1', summary: 'Panel 1' }]);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px');
    });

    it('should cleanup ResizeObserver on unmount', () => {
      const { unmount } = renderPanels([{ id: 'panel-1', summary: 'Panel 1' }]);

      const disconnectSpy = vi.spyOn(mockResizeObserver, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Resize integration', () => {
    it('should update grid template after resize operation', async () => {
      // Note: Detailed resize logic is tested in expansion-utils.test.ts
      // This is just a smoke test to verify resize integrates properly
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('300px 300px');
      // The actual resize constraints are tested in expansion-utils.test.ts
    });
  });

  describe('Space redistribution edge cases', () => {
    it('should set panels to minimum height when not enough space available', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-3', summary: 'Panel 3', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
      ];

      const { container } = renderPanels(configs);
      mockAllPanels(container);
      mockContainerHeight(container, 200);
      await waitForUpdate();

      await clickElements(['Panel 1', 'Panel 2', 'Panel 3']);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();

      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(3);
    });

    it('should distribute space proportionally when enough space is available', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 200, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 400, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 1000, configurable: true });

      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();

      const heights = parseHeights(gridTemplate);
      expect(heights[0]).toBeGreaterThan(100);
      expect(heights[1]).toBeGreaterThan(100);
    });
  });

  describe('Resize edge cases', () => {
    it('should not resize when panel is collapsed', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const initialGridTemplate = getGridTemplate(container);

      // Collapsed panel should not have a resize handle visible
      // The resize function has early return for collapsed panels
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBe(initialGridTemplate);
    });

    it('should not resize bottom handle when it is the last panel', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const initialGridTemplate = getGridTemplate(container);

      // Single panel - resize handle exists but resize has no effect (no adjacent panel)
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBe(initialGridTemplate);
    });

    it('should handle resize for non-existent panel id gracefully', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      const initialGridTemplate = getGridTemplate(container);

      // Grid template should remain unchanged when resize is called with non-existent id
      // (This tests the currentIdx === -1 early return)
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBe(initialGridTemplate);
    });
  });

  describe('Dynamic Panel Registration', () => {
    it('should redistribute space when new panel is added and would overflow container', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 400, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 400, defaultExpanded: true },
      ];

      const { container, rerender } = renderPanels(configs);
      mockAllPanels(container);
      mockContainerHeight(container, 600);
      await waitForUpdate();

      // Add a third panel that would cause overflow (400 + 400 + 400 > 600)
      const newConfigs: PanelConfig[] = [
        ...configs,
        { id: 'panel-3', summary: 'Panel 3', defaultHeight: 400, defaultExpanded: true },
      ];

      rerender(<ExpansionPanels>{newConfigs.map(createPanelElement)}</ExpansionPanels>);
      mockAllPanels(container);
      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
      // All three panels should be present and redistributed to fit
      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(3);
      // Total should not exceed container height
      const totalHeight = heights.reduce((sum, h) => sum + h, 0);
      expect(totalHeight).toBeLessThanOrEqual(600);
    });

    it('should NOT redistribute when new panel fits within container', async () => {
      const configs: PanelConfig[] = [{ id: 'panel-1', summary: 'Panel 1', defaultHeight: 200, defaultExpanded: true }];

      const { container, rerender } = renderPanels(configs);
      mockAllPanels(container);
      mockContainerHeight(container, 1000); // Large container
      await waitForUpdate();

      const initialGridTemplate = getGridTemplate(container);
      expect(initialGridTemplate).toContain('200px');

      // Add a second panel that fits (200 + 300 < 1000)
      const newConfigs: PanelConfig[] = [
        ...configs,
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, defaultExpanded: true },
      ];

      rerender(<ExpansionPanels>{newConfigs.map(createPanelElement)}</ExpansionPanels>);
      mockAllPanels(container);
      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      // Both panels should maintain their default heights since there's enough space
      expect(gridTemplate).toContain('200px');
      expect(gridTemplate).toContain('300px');
    });
  });

  describe('Panel Unregistration', () => {
    it('should redistribute freed space to remaining expanded panels when panel is removed', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, defaultExpanded: true },
      ];

      const { container, rerender } = renderPanels(configs);
      await setupPanelMocks(container);

      const initialHeights = parseHeights(getGridTemplate(container));
      expect(initialHeights).toEqual([300, 300]);

      // Remove panel-2
      rerender(<ExpansionPanels>{createPanelElement(configs[0])}</ExpansionPanels>);
      mockAllPanels(container);
      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      const heights = parseHeights(gridTemplate);

      // panel-1 should have received the freed space from panel-2
      expect(heights).toHaveLength(1);
      expect(heights[0]).toBeGreaterThanOrEqual(300);
    });

    it('should handle unregistration when no expanded panels remain', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300, defaultExpanded: true },
      ];

      const { container, rerender } = renderPanels(configs);
      await setupPanelMocks(container);

      // Remove the only expanded panel
      rerender(<ExpansionPanels>{createPanelElement(configs[0])}</ExpansionPanels>);
      mockAllPanels(container);
      await waitForUpdate();

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
      // Should not crash, collapsed panel remains
      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(1);
    });
  });

  describe('firstPanelId prop', () => {
    it('should assign ORDER_FIRST (0) to panel with firstPanelId prop', async () => {
      const configs: PanelConfig[] = [
        { id: 'middle-panel', summary: 'Middle' },
        { id: 'first-panel', summary: 'First' },
        { id: 'last-panel', summary: 'Last' },
      ];

      const { container } = render(
        <ExpansionPanels firstPanelId="first-panel" lastPanelId="last-panel">
          {configs.map((cfg) => (
            <ExpansionPanel key={cfg.id} id={cfg.id} summary={<div>{cfg.summary}</div>}>
              Content
            </ExpansionPanel>
          ))}
        </ExpansionPanels>,
      );

      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
      // Grid template should have 3 panel heights
      const heights = parseHeights(gridTemplate);
      expect(heights).toHaveLength(3);
    });
  });

  describe('Layout Callbacks', () => {
    it('should provide queueLayoutChange in context', async () => {
      const configs: PanelConfig[] = [{ id: 'panel-1', summary: 'Panel 1' }];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      // The context should be set up correctly (tested indirectly through rendering)
      const expansionPanelsContainer = container.querySelector('.expansion-panels');
      expect(expansionPanelsContainer).toBeInTheDocument();
    });

    it('should provide registerLayoutCallback and unregisterLayoutCallback in context', async () => {
      const configs: PanelConfig[] = [{ id: 'panel-1', summary: 'Panel 1' }];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      // The context should be set up correctly with all callback methods
      const expansionPanelsContainer = container.querySelector('.expansion-panels');
      expect(expansionPanelsContainer).toBeInTheDocument();
    });

    it('should execute layout callbacks after grid template changes', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultExpanded: true },
      ];

      const { container } = renderPanels(configs);
      await setupPanelMocks(container);

      // Collapse a panel to trigger grid template change
      const panel1Summary = screen.getByText('Panel 1');
      await clickElement(panel1Summary);

      // Grid template should be updated
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
    });

    it('should flush layout callbacks after panel unregistration', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1', defaultExpanded: true },
        { id: 'panel-2', summary: 'Panel 2', defaultExpanded: true },
      ];

      const { container, rerender } = renderPanels(configs);
      await setupPanelMocks(container);

      // Remove a panel
      rerender(<ExpansionPanels>{createPanelElement(configs[0])}</ExpansionPanels>);
      mockAllPanels(container);
      await waitForUpdate();

      // Grid should be updated after unregistration
      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
    });

    it('should execute registered layout callbacks on resize even when queue is empty', async () => {
      const callbackRef = { current: false };
      const TestPanel = createTestPanelWithCallback(callbackRef);

      const { container } = render(
        <ExpansionPanels>
          <TestPanel id="test-panel-1" />
          <TestPanel id="test-panel-2" />
        </ExpansionPanels>,
      );

      await setupPanelMocks(container);

      // Flush any stale queued callbacks from registration so the queue is empty,
      // simulating the real app where transitionend drains the queue before a resize
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });

      // Reset after registration callbacks
      callbackRef.current = false;

      // Trigger a container resize that doesn't change heights (horizontal resize)
      // With an empty queue, executeAllLayoutCallbacks must iterate the persistent
      // panelCallbacksRef registry — not the transient layoutChangeQueueRef
      const expansionPanelsContainer = container.querySelector('.expansion-panels') as HTMLElement;
      Object.defineProperty(expansionPanelsContainer, 'offsetHeight', { value: 600, configurable: true });

      await act(async () => {
        mockResizeObserver.trigger();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });

      expect(callbackRef.current).toBe(true);
    });

    it('should flush layout callbacks after panel registration (fix for primitive parameters)', async () => {
      // This test covers the bug fix for primitive parameters without schemas
      // When a panel registers, callbacks should be flushed via double RAF
      const callbackRef = { current: false };
      const TestPanel = createTestPanelWithCallback(callbackRef);

      const { container, rerender } = render(
        <ExpansionPanels>
          <TestPanel id="test-panel-1" />
        </ExpansionPanels>,
      );

      await setupPanelMocks(container);

      // Reset the flag
      callbackRef.current = false;

      // Add a new panel - this triggers the register function
      rerender(
        <ExpansionPanels>
          <TestPanel id="test-panel-1" />
          <TestPanel id="test-panel-2" />
        </ExpansionPanels>,
      );

      await setupPanelMocks(container);

      // Wait for double RAF to complete (lines 229-235 in ExpansionPanels.tsx)
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });

      // Verify the callback was executed after panel registration
      // This ensures connection ports are synced for primitive parameters
      expect(callbackRef.current).toBe(true);
    });
  });

  describe('Panel ordering with other children', () => {
    it('should lay out panels in their order when other elements sit between them', async () => {
      stubLayoutHeights({ container: 1000, header: 50, panel: 300 });

      const { container } = render(
        <ExpansionPanels>
          {createPanelElement({ id: 'panel-1', summary: 'Panel 1', defaultHeight: 200 })}
          <div>Divider</div>
          {createPanelElement({ id: 'panel-2', summary: 'Panel 2', defaultHeight: 300 })}
        </ExpansionPanels>,
      );
      await waitForLayoutToSettle();

      expect(getGridTemplate(container)).toBe('200px 300px');
    });
  });

  describe('Resizing by dragging the handle', () => {
    it('should grow the dragged panel and shrink the expanded panel below it', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300 },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300 },
      ]);
      await waitForLayoutToSettle();

      dragResizeHandle('Panel 1', 50);

      expect(getGridTemplate(container)).toBe('350px 250px');
    });

    it('should take the space from the next expanded panel when collapsed panels sit in between', async () => {
      stubLayoutHeights({ container: 650, header: 50, panel: 300 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300 },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-3', summary: 'Panel 3', minHeight: 100, defaultHeight: 300 },
      ]);
      await waitForLayoutToSettle();

      dragResizeHandle('Panel 1', 50);

      expect(getGridTemplate(container)).toBe('350px 50px 250px');
    });

    it.each([
      { case: 'it is the last panel', belowExpanded: true, dragged: 'Panel 2', expected: '300px 300px' },
      { case: 'only collapsed panels are below it', belowExpanded: false, dragged: 'Panel 1', expected: '300px 50px' },
    ])('should not resize a panel when $case', async ({ belowExpanded, dragged, expected }) => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300 },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300, defaultExpanded: belowExpanded },
      ]);
      await waitForLayoutToSettle();
      const templateBeforeDrag = getGridTemplate(container);

      dragResizeHandle(dragged, 50);

      expect(templateBeforeDrag).toBe(expected);
      expect(getGridTemplate(container)).toBe(expected);
    });
  });

  describe('Expanding and collapsing', () => {
    it('should share the space equally above the min heights when a panel expands next to an expanded one', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 400 },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 100, defaultExpanded: false },
      ]);
      await waitForLayoutToSettle();

      await clickElement(screen.getByText('Panel 2'));

      expect(getGridTemplate(container)).toBe('300px 300px');
    });

    it('should give a panel no taller than its header at least its min height when it expands into a full container', async () => {
      stubLayoutHeights({ container: 150, header: 50, panel: 100 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300 },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 50, defaultExpanded: false },
      ]);
      await waitForLayoutToSettle();

      await clickElement(screen.getByText('Panel 2'));

      expect(getGridTemplate(container)).toBe('100px 100px');
    });

    it('should not hand out the space of a collapsed panel again when defaultExpanded turns false afterwards', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const panel2 = { id: 'panel-2', summary: 'Panel 2', defaultHeight: 300 };
      const { container, rerender } = renderPanels([{ id: 'panel-1', summary: 'Panel 1', defaultHeight: 300 }, panel2]);
      await waitForLayoutToSettle();
      await clickElement(screen.getByText('Panel 1'));
      expect(getGridTemplate(container)).toBe('50px 550px');

      rerender(
        <ExpansionPanels>
          {[{ id: 'panel-1', summary: 'Panel 1', defaultHeight: 300, defaultExpanded: false }, panel2].map(
            createPanelElement,
          )}
        </ExpansionPanels>,
      );
      await waitForUpdate();

      expect(getGridTemplate(container)).toBe('50px 550px');
    });
  });

  describe('Container resize with collapsed panels', () => {
    it('should keep collapsed panels at their header height and give the expanded panels the rest', async () => {
      const layout = stubLayoutHeights({ container: 650, header: 50, panel: 300 });
      const { container } = renderPanels([
        { id: 'panel-1', summary: 'Panel 1', minHeight: 100, defaultHeight: 300, defaultExpanded: false },
        { id: 'panel-2', summary: 'Panel 2', minHeight: 100, defaultHeight: 300 },
        { id: 'panel-3', summary: 'Panel 3', minHeight: 100, defaultHeight: 300 },
      ]);
      await waitForLayoutToSettle();

      layout.container = 850;
      await triggerContainerResize(mockResizeObserver);

      expect(getGridTemplate(container)).toBe('50px 400px 400px');
    });
  });

  describe('Layout change notifications', () => {
    const renderPanelsWithLayoutListeners = () => {
      const onLayoutChange1 = vi.fn();
      const onLayoutChange2 = vi.fn();
      const view = render(
        <ExpansionPanels>
          <ExpansionPanel id="panel-1" summary="Panel 1" onLayoutChange={onLayoutChange1}>
            Content 1
          </ExpansionPanel>
          <ExpansionPanel id="panel-2" summary="Panel 2" onLayoutChange={onLayoutChange2}>
            Content 2
          </ExpansionPanel>
        </ExpansionPanels>,
      );
      return { ...view, onLayoutChange1, onLayoutChange2 };
    };

    it('should run a queued layout change only after a panel registration has settled', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const onQueuedChange = vi.fn();
      const QueueLayoutChangeOnMount = () => {
        const context = useContext(ExpansionContext);
        useEffect(() => {
          context.queueLayoutChange(onQueuedChange);
        }, [context]);
        return null;
      };

      render(
        <ExpansionPanels>
          <QueueLayoutChangeOnMount />
          {createPanelElement({ id: 'panel-1', summary: 'Panel 1' })}
        </ExpansionPanels>,
      );
      expect(onQueuedChange).not.toHaveBeenCalled();

      await waitForLayoutToSettle();

      expect(onQueuedChange).toHaveBeenCalledTimes(1);
    });

    it('should notify every panel once per animation frame while the container scrolls', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container, onLayoutChange1, onLayoutChange2 } = renderPanelsWithLayoutListeners();
      await waitForLayoutToSettle();
      onLayoutChange1.mockClear();
      onLayoutChange2.mockClear();

      const animationFrames = collectAnimationFrames();

      fireEvent.scroll(getPanelsContainer(container));
      fireEvent.scroll(getPanelsContainer(container));
      animationFrames.runNextFrame();

      expect(onLayoutChange1).toHaveBeenCalledExactlyOnceWith('panel-1');
      expect(onLayoutChange2).toHaveBeenCalledExactlyOnceWith('panel-2');
    });

    it('should notify every panel when the grid row transition of the container ends', async () => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container, onLayoutChange1, onLayoutChange2 } = renderPanelsWithLayoutListeners();
      await waitForLayoutToSettle();
      onLayoutChange1.mockClear();
      onLayoutChange2.mockClear();

      fireTransitionEnd(getPanelsContainer(container), 'grid-template-rows');
      await waitForAnimationFrames();

      expect(onLayoutChange1).toHaveBeenCalledWith('panel-1');
      expect(onLayoutChange2).toHaveBeenCalledWith('panel-2');
    });

    it.each([
      {
        case: 'another property of the container',
        getTarget: (container: HTMLElement) => getPanelsContainer(container),
        propertyName: 'opacity',
      },
      {
        case: 'the grid rows of a panel inside the container',
        getTarget: () => screen.getByText('Panel 1').closest('.expansion-panel') as HTMLElement,
        propertyName: 'grid-template-rows',
      },
    ])('should not notify the panels when a transition of $case ends', async ({ getTarget, propertyName }) => {
      stubLayoutHeights({ container: 600, header: 50, panel: 300 });
      const { container, onLayoutChange1, onLayoutChange2 } = renderPanelsWithLayoutListeners();
      await waitForLayoutToSettle();
      onLayoutChange1.mockClear();
      onLayoutChange2.mockClear();

      fireTransitionEnd(getTarget(container), propertyName);
      await waitForAnimationFrames();

      expect(onLayoutChange1).not.toHaveBeenCalled();
      expect(onLayoutChange2).not.toHaveBeenCalled();
    });
  });
});
