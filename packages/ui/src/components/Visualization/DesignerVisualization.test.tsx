import { isNode, Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MockInstance } from 'vitest';

import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { COLLAPSE_STATE } from './Canvas/collapse-handler-state';
import { ControllerService } from './Canvas/controller.service';
import { buildDesignerCanvasModel } from './designer-canvas-model';
import { DesignerVisualization } from './DesignerVisualization';
import { TopologyVisualization } from './TopologyVisualization';

describe('DesignerVisualization', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);
  const otherEntity = new CamelRouteVisualEntity({ route: { ...camelRouteJson.route, id: 'route-9999' } });
  const map = { 'route-8888': true };

  let controller: Visualization;
  let fromModelSpy: MockInstance<Visualization['fromModel']>;

  beforeEach(() => {
    controller = ControllerService.createController();
    fromModelSpy = vi.spyOn(controller, 'fromModel');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderWithVisibleFlows(ui: ReactElement, visibleFlows: Record<string, boolean>) {
    const { Provider } = await TestProvidersWrapper({
      visibleFlowsContext: { visibleFlows, allFlowsVisible: true, visualFlowsApi: new VisualFlowsApi(vi.fn()) },
    });

    const result = render(
      <Provider>
        <VisualizationProvider controller={controller}>{ui}</VisualizationProvider>
      </Provider>,
    );

    return {
      ...result,
      rerender: (newUi: ReactElement) => {
        result.rerender(
          <Provider>
            <VisualizationProvider controller={controller}>{newUi}</VisualizationProvider>
          </Provider>,
        );
      },
    };
  }

  /** The canvas model drawn last into the controller */
  const getDrawnModel = (): Model => fromModelSpy.mock.lastCall![0];

  /** Ids of the canvas model the designer is expected to draw for the given root viz nodes */
  const getExpectedIds = (vizNodes: IVisualizationNode[]) => {
    const { nodes, edges } = buildDesignerCanvasModel(vizNodes);
    return { nodeIds: nodes.map(({ id }) => id), edgeIds: edges.map(({ id }) => id) };
  };

  /** Ids of the canvas model drawn last into the controller */
  const getDrawnIds = () => {
    const { nodes = [], edges = [] } = getDrawnModel();
    return { nodeIds: nodes.map(({ id }) => id), edgeIds: edges.map(({ id }) => id) };
  };

  it('renders the root surface with default and custom class names', async () => {
    const { container } = await renderWithVisibleFlows(
      <DesignerVisualization className="my-viz" entities={[entity]} />,
      map,
    );

    const surface = container.querySelector('.canvas-surface');
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveClass('canvas-surface', 'my-viz');
  });

  it('passes built canvas model and entitiesCount to Canvas', async () => {
    const twoFlowsMap = { 'route-8888': true, 'route-9999': true };
    const expectedIds = getExpectedIds([await entity.toVizNode(), await otherEntity.toVizNode()]);

    const { rerender } = await renderWithVisibleFlows(
      <DesignerVisualization entities={[entity, otherEntity]} />,
      twoFlowsMap,
    );

    /* The model built from both visible flows is drawn once resolved */
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
    expect(getDrawnIds()).toEqual(expectedIds);
    expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();

    /* Collapsed groups are re-applied when the model is updated (applyCollapseOnUpdate) */
    controller.setState({ [COLLAPSE_STATE]: ['route-8888'] });
    fromModelSpy.mockClear();
    rerender(<DesignerVisualization entities={[entity, otherEntity]} />);

    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledWith(expect.anything(), true);
    });
    const collapsedRoute = controller
      .getElements()
      .find((element) => isNode(element) && element.getData()?.vizNode?.data?.definition?.id === 'route-8888');
    expect(collapsedRoute).toBeDefined();
    expect(collapsedRoute && isNode(collapsedRoute) && collapsedRoute.isCollapsed()).toBe(true);
  });

  it('calls useVisibleVizNodes with the given entities and visible flow map from context', async () => {
    const expectedIds = getExpectedIds([await entity.toVizNode()]);

    await renderWithVisibleFlows(<DesignerVisualization entities={[entity, otherEntity]} />, map);

    /* Only the flows visible in the context map are resolved and drawn */
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
    expect(getDrawnIds()).toEqual(expectedIds);
  });

  it('does not show EmptyCanvas while viz nodes are resolving', async () => {
    await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, map);

    /* The viz nodes are resolved asynchronously: nothing is drawn nor reported as empty yet */
    expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    expect(fromModelSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
  });

  it('shows EmptyCanvas when entities exist but no viz nodes after resolve', async () => {
    await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, { 'route-8888': false });

    const empty = await screen.findByTestId('visualization-empty-state');
    /* The single existing entity is reported as hidden */
    expect(empty).toHaveTextContent('There are no visible routes');
    expect(fromModelSpy).not.toHaveBeenCalled();
  });

  it('hands focus to each replacement canvas when routes are hidden and shown repeatedly', async () => {
    const { Provider } = await TestProvidersWrapper();
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const entities = [entity];
    const view = (visible: boolean) => (
      <RuntimeProvider>
        <Provider>
          <VisibleFlowsContext.Provider
            value={{
              visibleFlows: { 'route-8888': visible },
              allFlowsVisible: visible,
              visualFlowsApi: new VisualFlowsApi(vi.fn()),
            }}
          >
            <VisualizationProvider controller={controller}>
              <DesignerVisualization entities={entities} />
            </VisualizationProvider>
          </VisibleFlowsContext.Provider>
        </Provider>
      </RuntimeProvider>
    );
    const { rerender } = render(view(true));
    const initialCanvas = await screen.findByRole('region', { name: 'Route canvas' });
    await waitFor(() => expect(initialCanvas).not.toHaveClass('hidden'));
    initialCanvas.focus();

    for (const visible of [false, true, false, true]) {
      rerender(view(visible));
      await waitFor(() => expect(screen.getByLabelText('Route canvas')).toHaveFocus());
      expect(screen.getByLabelText('Route canvas')).not.toHaveClass('hidden');
      expect(screen.queryByTestId('visualization-empty-state') !== null).toBe(!visible);
    }
  });

  describe.each([
    { name: 'designer', View: DesignerVisualization },
    { name: 'topology', View: TopologyVisualization },
  ])('$name first-route transition', ({ View }) => {
    it.each(['canvas', 'outside', 'blurred', 'removed'] as const)(
      'respects the focus destination (%s) when the first route resolves',
      async (destination) => {
        const { Provider } = await TestProvidersWrapper();
        const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
        const view = (entities: CamelRouteVisualEntity[], showOutside = true) => (
          <>
            <RuntimeProvider>
              <Provider>
                <VisibleFlowsContext.Provider
                  value={{ visibleFlows: map, allFlowsVisible: true, visualFlowsApi: new VisualFlowsApi(vi.fn()) }}
                >
                  <VisualizationProvider controller={controller}>
                    <View entities={entities} />
                  </VisualizationProvider>
                </VisibleFlowsContext.Provider>
              </Provider>
            </RuntimeProvider>
            {showOutside && <button>Outside</button>}
          </>
        );
        const vizNode = await entity.toVizNode();
        let resolveRoute!: (node: IVisualizationNode) => void;
        vi.spyOn(entity, 'toVizNode').mockReturnValue(
          new Promise((resolve) => {
            resolveRoute = resolve;
          }),
        );
        const { rerender } = render(view([]));
        const emptyCanvas = await screen.findByLabelText('Route canvas');
        emptyCanvas.focus();
        rerender(view([entity]));
        expect(document.body).toHaveFocus();
        const outside = screen.getByRole('button', { name: 'Outside' });
        if (destination !== 'canvas') outside.focus();
        if (destination === 'blurred') outside.blur();
        if (destination === 'removed') rerender(view([entity], false));

        await act(async () => {
          resolveRoute(vizNode);
        });
        await waitFor(() => expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByLabelText('Route canvas')).not.toHaveClass('hidden'));
        if (destination === 'canvas') expect(screen.getByLabelText('Route canvas')).toHaveFocus();
        else expect(destination === 'outside' ? outside : document.body).toHaveFocus();
        expect(screen.getByLabelText('Route canvas')).not.toBe(emptyCanvas);
      },
    );
  });
});
