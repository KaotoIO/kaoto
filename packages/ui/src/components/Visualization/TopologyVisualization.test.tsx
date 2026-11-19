import { Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { render, screen, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';

import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { ControllerService } from './Canvas/controller.service';
import { FlowService } from './Canvas/flow.service';
import { TopologyVisualization } from './TopologyVisualization';

describe('TopologyVisualization', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  let controller: Visualization;
  let fromModelSpy: MockInstance<Visualization['fromModel']>;

  beforeEach(() => {
    controller = ControllerService.createController();
    fromModelSpy = vi.spyOn(controller, 'fromModel');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderTopology = async (entities: CamelRouteVisualEntity[]) => {
    const { Provider } = await TestProvidersWrapper();
    /* The empty state reads the runtime */
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const view = (currentEntities: CamelRouteVisualEntity[]) => (
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>
            <TopologyVisualization entities={currentEntities} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>
    );
    const result = render(view(entities));
    return {
      ...result,
      rerenderWith: (currentEntities: CamelRouteVisualEntity[]) => {
        result.rerender(view(currentEntities));
      },
    };
  };

  /** The node ids of every model drawn so far */
  const getDrawnNodeIds = () =>
    fromModelSpy.mock.calls.map(([model]: [Model, boolean?]) => model.nodes?.map((n) => n.id));

  it('draws one node per route', async () => {
    await renderTopology([entity]);

    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(1);
    });
    expect(getDrawnNodeIds()).toEqual([['route-8888']]);
  });

  it('shows the empty state when there are no routes', async () => {
    await renderTopology([]);

    expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
    expect(fromModelSpy).not.toHaveBeenCalled();
  });

  it('keeps the canvas and its diagram until the next diagram is built', async () => {
    const { container, rerenderWith } = await renderTopology([entity]);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(1);
    });
    const root = container.querySelector('#canvas-main');
    expect(root).toBeInTheDocument();

    rerenderWith([entity]);

    expect(container.querySelector('#canvas-main')).toBe(root);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(2);
    });
    expect(container.querySelector('#canvas-main')).toBe(root);
    /* Neither an empty model nor the previous one is drawn in between */
    expect(getDrawnNodeIds()).toEqual([['route-8888'], ['route-8888']]);
    expect(fromModelSpy).toHaveBeenLastCalledWith(expect.anything(), true);
  });

  it('shows the empty state when the diagram cannot be built', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(FlowService, 'getTopologyFlowDiagram').mockRejectedValue(new Error('no diagram'));

    await renderTopology([entity]);

    expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
    expect(fromModelSpy).not.toHaveBeenCalled();
  });
});
