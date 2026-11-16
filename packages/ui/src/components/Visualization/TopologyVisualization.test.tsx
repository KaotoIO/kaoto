import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MockInstance } from 'vitest';

import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { ControllerService } from './Canvas/controller.service';
import { TopologyVisualization } from './TopologyVisualization';

describe('TopologyVisualization', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);
  const otherEntity = new CamelRouteVisualEntity({ route: { ...camelRouteJson.route, id: 'route-9999' } });

  let controller: Visualization;
  let fromModelSpy: MockInstance<Visualization['fromModel']>;

  beforeEach(() => {
    controller = ControllerService.createController();
    fromModelSpy = vi.spyOn(controller, 'fromModel');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderTopology(ui: ReactElement) {
    const { Provider } = await TestProvidersWrapper();
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const wrap = (child: ReactElement) => (
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>{child}</VisualizationProvider>
        </Provider>
      </RuntimeProvider>
    );
    const result = render(wrap(ui));
    return {
      ...result,
      rerender: (newUi: ReactElement) => {
        result.rerender(wrap(newUi));
      },
    };
  }

  /** Waits until the diagram drawn last holds nodes of the given number of routes */
  const waitForDrawnDiagram = async () => {
    await waitFor(() => {
      expect(fromModelSpy.mock.lastCall?.[0].nodes?.length ?? 0).toBeGreaterThan(0);
    });
  };

  it('does not draw an empty model between two diagrams', async () => {
    const { rerender } = await renderTopology(<TopologyVisualization entities={[entity]} />);
    await waitForDrawnDiagram();
    fromModelSpy.mockClear();
    const emptyStateShown = vi.fn();
    const observer = new MutationObserver(() => {
      if (screen.queryByTestId('visualization-empty-state')) emptyStateShown();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    rerender(<TopologyVisualization entities={[entity, otherEntity]} />);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
    await waitForDrawnDiagram();
    observer.disconnect();

    for (const [model] of fromModelSpy.mock.calls) {
      expect(model.nodes?.length ?? 0).toBeGreaterThan(0);
    }
    expect(emptyStateShown).not.toHaveBeenCalled();
  });

  it('does not refit the graph after an edit', async () => {
    const { rerender } = await renderTopology(<TopologyVisualization entities={[entity]} />);
    await waitForDrawnDiagram();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const fitSpy = vi.spyOn(controller.getGraph(), 'fit');
    fromModelSpy.mockClear();

    rerender(<TopologyVisualization entities={[entity, otherEntity]} />);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
    await waitForDrawnDiagram();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(fitSpy).not.toHaveBeenCalled();
    expect(fromModelSpy).not.toHaveBeenCalledWith(expect.anything(), false);
  });
});
