import { isNode, Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, useContext } from 'react';
import type { MockInstance } from 'vitest';

import { CamelRouteResource } from '../../models/camel';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { EntitiesContext, EntitiesProvider, KaotoResourceContext, VisibleFlowsProvider } from '../../providers';
import { useSourceCodeStore } from '../../store';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { COLLAPSE_STATE } from './Canvas/collapse-handler-state';
import { ControllerService } from './Canvas/controller.service';
import { buildDesignerCanvasModel } from './designer-canvas-model';
import { DesignerVisualization } from './DesignerVisualization';

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

  it('does not show the empty state overlay while viz nodes are resolving', async () => {
    await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, map);

    /* The viz nodes are resolved asynchronously: nothing is drawn nor reported as empty yet */
    expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    expect(fromModelSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
  });

  it('shows the empty state overlay when entities exist but no viz nodes after resolve', async () => {
    await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, { 'route-8888': false });

    const empty = await screen.findByTestId('visualization-empty-state');
    /* The single existing entity is reported as hidden, over an empty graph */
    expect(empty).toHaveTextContent('There are no visible routes');
    expect(empty.closest('.canvas-empty-state')).toBeInTheDocument();
    expect(getDrawnIds()).toEqual({ nodeIds: [], edgeIds: [] });
  });

  describe('switching between the empty and the populated view', () => {
    /** Renders the designer like the Design page does, with the real entities and visible flows providers */
    async function renderDesigner(camelResource: CamelRouteResource) {
      // jsdom has no viewport dimensions; keep the real node renderers mounted
      controller.setRenderConstraint(false);
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const kaotoResourceContext = { kaotoResource: camelResource };
      const DesignView = () => <DesignerVisualization entities={useContext(EntitiesContext)!.visualEntities} />;

      const result = render(
        <RuntimeProvider>
          <KaotoResourceContext.Provider value={kaotoResourceContext}>
            <EntitiesProvider>
              <VisibleFlowsProvider>
                <VisualizationProvider controller={controller}>
                  <DesignView />
                </VisualizationProvider>
              </VisibleFlowsProvider>
            </EntitiesProvider>
          </KaotoResourceContext.Provider>
        </RuntimeProvider>,
      );
      // Let the entities provider finish initializing the resource, so the rendered view is settled
      await act(() => new Promise((resolve) => setTimeout(resolve)));

      const getCanvas = () => result.container.querySelector<HTMLElement>('#canvas-main');
      // user.click() cannot be used on the graph: the d3 pan/drag handlers fail on mousedown in jsdom
      const hideAllRoutes = async () => {
        fireEvent.contextMenu(result.container.querySelector('[data-kind="graph"] > rect')!);
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide all' }));
      };

      return { ...result, getCanvas, hideAllRoutes };
    }

    it('keeps the same canvas and toolbar when all routes are hidden and shown again', async () => {
      const user = userEvent.setup();
      const { container, getCanvas, hideAllRoutes } = await renderDesigner(
        new CamelRouteResource([{ route: { id: 'route-1', from: { uri: 'timer:one', steps: [] } } }]),
      );
      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      const canvas = getCanvas();

      await hideAllRoutes();

      expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
      expect(getCanvas()).toBe(canvas);

      await user.click(screen.getByTestId('show-all-routes-button'));

      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
      expect(getCanvas()).toBe(canvas);
    });

    it('keeps the canvas menu reachable after hiding all routes', async () => {
      const user = userEvent.setup();
      const { container, getCanvas } = await renderDesigner(
        new CamelRouteResource([{ route: { id: 'route-1', from: { uri: 'timer:one', steps: [] } } }]),
      );
      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      await user.tab();
      expect(getCanvas()).toHaveFocus();

      await user.keyboard('{Shift>}{F10}{/Shift}');
      let menu = await screen.findByRole('menu', { name: 'Canvas actions' });
      await waitFor(() => {
        expect(within(menu).getByRole('menuitem', { name: 'Show all' })).toHaveFocus();
      });
      await user.keyboard('{ArrowDown}');
      expect(within(menu).getByRole('menuitem', { name: 'Hide all' })).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
      expect(menu).not.toBeInTheDocument();
      await waitFor(() => {
        expect(getCanvas()).toHaveFocus();
      });

      await user.keyboard('{Shift>}{F10}{/Shift}');
      menu = await screen.findByRole('menu', { name: 'Canvas actions' });
      await waitFor(() => {
        expect(within(menu).getByRole('menuitem', { name: 'Show all' })).toHaveFocus();
      });
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(getCanvas()).toHaveFocus();
      });
    });

    it('opens the canvas menu on right-click, also on the empty canvas', async () => {
      const { container } = await renderDesigner(new CamelRouteResource([]));
      expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();

      fireEvent.contextMenu(container.querySelector('[data-kind="graph"] > rect')!);

      const menu = await screen.findByRole('menu', { name: 'Canvas actions' });
      expect(within(menu).getByRole('menuitem', { name: 'Show all' })).toBeInTheDocument();
    });

    it('keeps the canvas mounted while the first route resolves', async () => {
      const { container, getCanvas } = await renderDesigner(new CamelRouteResource([]));
      expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();
      const canvas = getCanvas();
      expect(canvas).toBeInTheDocument();

      /* The "New" button of the empty state adds a route of the current type */
      fireEvent.click(screen.getByTestId('dsl-list-btn'));

      /* The new route's viz nodes are still resolving */
      expect(container.querySelector('[data-kind="node"]')).not.toBeInTheDocument();
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
      expect(getCanvas()).toBe(canvas);
      expect(canvas).not.toHaveClass('canvas-uninitialized');
    });

    it('focuses the canvas after creating the first route from the empty state', async () => {
      const user = userEvent.setup();
      const { container, getCanvas } = await renderDesigner(new CamelRouteResource([]));

      await user.click(screen.getByTestId('dsl-list-btn'));

      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(getCanvas()).toHaveFocus();
      });
    });

    it('focuses the canvas after changing the integration type from the empty state', async () => {
      onTestFinished(() => {
        useSourceCodeStore.setState({ sourceCode: '', path: '' });
      });
      const user = userEvent.setup();
      const { getCanvas } = await renderDesigner(new CamelRouteResource([]));

      await user.click(screen.getByTestId('viz-dsl-list-dropdown'));
      await user.click(screen.getByText('Pipe'));
      await user.click(await screen.findByTestId('confirmation-modal-confirm'));

      await waitFor(() => {
        expect(getCanvas()).toHaveFocus();
      });
    });

    it('focuses the canvas after showing all routes from the empty state', async () => {
      const user = userEvent.setup();
      const { container, getCanvas, hideAllRoutes } = await renderDesigner(
        new CamelRouteResource([{ route: { id: 'route-1', from: { uri: 'timer:one', steps: [] } } }]),
      );
      await waitFor(() => {
        expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
      });
      await hideAllRoutes();

      await user.click(await screen.findByTestId('show-all-routes-button'));

      await waitFor(() => {
        expect(getCanvas()).toHaveFocus();
      });
    });
  });
});
