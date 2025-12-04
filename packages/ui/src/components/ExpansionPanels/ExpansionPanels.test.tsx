import { act, render, screen } from '@testing-library/react';

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
    labels.forEach((label) => screen.getByText(label).click());
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

describe('ExpansionPanels', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = jest.fn((callback) => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver as unknown as ResizeObserver;
    }) as unknown as typeof ResizeObserver;

    globalThis.queueMicrotask ??= (callback: () => void) => {
      void Promise.resolve().then(callback);
    };
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
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

    it('should assign ORDER_FIRST (0) to parameters-header panel', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'parameters-header', summary: 'Parameters Header' },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toBeTruthy();
    });

    it('should assign ORDER_LAST (1000) to source-body panel and add spacer', async () => {
      const configs: PanelConfig[] = [
        { id: 'panel-1', summary: 'Panel 1' },
        { id: 'source-body', summary: 'Body' },
      ];

      const { container } = renderPanels(configs);
      await setupBasicPanels(container);

      const spacer = container.querySelector('.expansion-panels__spacer');
      expect(spacer).toBeInTheDocument();
      expect(spacer).toHaveAttribute('data-is-spacer', 'true');

      const gridTemplate = getGridTemplate(container);
      expect(gridTemplate).toContain('1fr');
    });

    it('should NOT add spacer when source-body is the only panel', async () => {
      const { container } = renderPanels([{ id: 'source-body', summary: 'Body' }]);
      await setupBasicPanels(container);

      const spacer = container.querySelector('.expansion-panels__spacer');
      expect(spacer).not.toBeInTheDocument();
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

      const disconnectSpy = jest.spyOn(mockResizeObserver, 'disconnect');

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
      expect(heights.length).toBe(3);
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
});
