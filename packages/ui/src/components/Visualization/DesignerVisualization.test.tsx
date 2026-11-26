import { isNode, Model, SELECTION_EVENT, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MockInstance } from 'vitest';

import { CamelRouteResource } from '../../models/camel';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { KaotoResourceContext, ResourceParseState } from '../../providers/kaoto-resource.provider';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { EventNotifier } from '../../utils';
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

    /* The empty state for a file without routes reads the runtime */
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const wrap = (children: ReactElement) => (
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>{children}</VisualizationProvider>
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

  it('keeps the canvas in the document while a changed model resolves', async () => {
    const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, map);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(1);
    });
    const root = container.querySelector('#canvas-main');
    const graph = container.querySelector('[data-kind="graph"]');
    expect(root).toBeInTheDocument();
    expect(graph).toBeInTheDocument();

    /* A new entities array starts a new resolution, like any edit does */
    rerender(<DesignerVisualization entities={[entity]} />);

    expect(container.querySelector('#canvas-main')).toBe(root);
    expect(fromModelSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(2);
    });
    /* The new model is merged into the graph that is already drawn */
    expect(fromModelSpy).toHaveBeenLastCalledWith(expect.anything(), true);
    expect(container.querySelector('#canvas-main')).toBe(root);
    expect(container.querySelector('[data-kind="graph"]')).toBe(graph);
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
    /* The empty state is shown inside the canvas, over an empty graph */
    expect(document.getElementById('canvas-main')).toContainElement(empty);
    expect(getDrawnModel().nodes).toEqual([]);
  });

  it('keeps the same canvas across the empty and the populated view', async () => {
    const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, map);
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalledTimes(1);
    });
    const root = container.querySelector('#canvas-main');
    const graph = container.querySelector('[data-kind="graph"]');

    /* Populated -> empty: the last route is removed */
    rerender(<DesignerVisualization entities={[]} />);
    const empty = await screen.findByTestId('visualization-empty-state');
    expect(empty).toHaveTextContent('There are no routes defined');
    expect(container.querySelector('#canvas-main')).toBe(root);
    expect(container.querySelector('[data-kind="graph"]')).toBe(graph);

    /* Empty -> populated: the empty state stays until the new model is drawn, then the canvas is fitted again */
    rerender(<DesignerVisualization entities={[entity]} />);
    expect(screen.getByTestId('visualization-empty-state')).toHaveTextContent('There are no routes defined');
    await waitFor(() => {
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    });
    expect(container.querySelector('#canvas-main')).toBe(root);
    expect(container.querySelector('[data-kind="graph"]')).toBe(graph);
    expect(fromModelSpy).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('draws the links to the tools again when the tags of an agent step are edited in place, keeping the selection', async () => {
    const agent = new CamelRouteVisualEntity({
      route: {
        id: 'agent',
        from: { uri: 'direct:agent', steps: [{ to: { uri: 'openai', parameters: { tags: 'support' } } }] },
      },
    });
    const tool = (id: string, tags: string) =>
      new CamelRouteVisualEntity({
        route: { id, from: { uri: 'ai-tool', parameters: { toolName: id, tags }, steps: [] } },
      });
    const entities = [agent, tool('support-tool', 'support'), tool('billing-tool', 'billing')];
    const linkedTools = () => getDrawnIds().edgeIds.filter((id) => id.endsWith('(ai-tool)'));

    await renderWithVisibleFlows(<DesignerVisualization entities={entities} />, {
      agent: true,
      'support-tool': true,
      'billing-tool': true,
    });
    await waitFor(() => {
      expect(linkedTools()).toEqual([expect.stringContaining('support-tool')]);
    });

    /* The side panel changes the definition of the step in place and updates the source, without new entities */
    const fireEventSpy = vi.spyOn(controller, 'fireEvent');
    const agentVizNode = getDrawnModel()
      .nodes!.map((node) => node.data?.vizNode as IVisualizationNode | undefined)
      .find((vizNode) => vizNode?.data.path === 'route.from.steps.0.to')!;
    const definition = agentVizNode.data.definition as { parameters: { tags: string } };
    definition.parameters.tags = 'billing';
    agentVizNode.updateModel(definition);
    act(() => {
      EventNotifier.getInstance().next('entities:updated', '');
    });

    await waitFor(() => {
      expect(linkedTools()).toEqual([expect.stringContaining('billing-tool')]);
    });
    /* The step stays selected, so the side panel that edits it stays open */
    expect(fireEventSpy).not.toHaveBeenCalledWith(SELECTION_EVENT, expect.anything());
  });

  describe('when the last document did not parse', () => {
    const parsedError = 'All mapping items must start at the same column at line 5, column 1';

    /** The resource context for the given parse outcome. The entities stay those of the last valid document */
    const withParseState = (ui: ReactElement, parseState: ResourceParseState) => (
      <KaotoResourceContext.Provider
        value={{
          kaotoResource: new CamelRouteResource(),
          parseState,
          parsedError: parseState === ResourceParseState.Error ? parsedError : undefined,
        }}
      >
        {ui}
      </KaotoResourceContext.Provider>
    );

    it('shows the broken-file state over the last drawn diagram and blocks it until the file parses again', async () => {
      /* While the document does not parse, the entities provider keeps the entities of the last valid one */
      const entities = [entity];
      const { container, rerender } = await renderWithVisibleFlows(
        withParseState(<DesignerVisualization entities={entities} />, ResourceParseState.Valid),
        map,
      );
      await waitFor(() => {
        expect(fromModelSpy).toHaveBeenCalledTimes(1);
      });
      const root = container.querySelector('#canvas-main');
      const graph = container.querySelector('[data-kind="graph"]');

      rerender(withParseState(<DesignerVisualization entities={entities} />, ResourceParseState.Error));

      const brokenState = await screen.findByTestId('broken-file-empty-state');
      expect(screen.getByTestId('broken-file-parse-error')).toHaveTextContent(parsedError);
      expect(root).toContainElement(brokenState);
      expect(container.querySelector('#canvas-main')).toBe(root);
      expect(container.querySelector('[data-kind="graph"]')).toBe(graph);
      expect(graph?.closest('[inert]')).not.toBeNull();
      expect(fromModelSpy).toHaveBeenCalledTimes(1);

      rerender(withParseState(<DesignerVisualization entities={entities} />, ResourceParseState.Valid));

      await waitFor(() => {
        expect(screen.queryByTestId('broken-file-empty-state')).not.toBeInTheDocument();
      });
      expect(container.querySelector('[data-kind="graph"]')).toBe(graph);
      expect(graph?.closest('[inert]')).toBeNull();
    });

    it('draws the diagram of the new source once it parses', async () => {
      const entities = [entity];
      const { container, rerender } = await renderWithVisibleFlows(
        withParseState(<DesignerVisualization entities={entities} />, ResourceParseState.Error),
        { ...map, 'route-9999': true },
      );
      await screen.findByTestId('broken-file-empty-state');
      const graph = container.querySelector('[data-kind="graph"]');

      /* The fixed source has another route: the entities provider hands over its entities */
      rerender(withParseState(<DesignerVisualization entities={[otherEntity]} />, ResourceParseState.Valid));

      const expectedIds = getExpectedIds([await otherEntity.toVizNode()]);
      await waitFor(() => {
        expect(getDrawnIds()).toEqual(expectedIds);
      });
      expect(screen.queryByTestId('broken-file-empty-state')).not.toBeInTheDocument();
      expect(container.querySelector('[data-kind="graph"]')).toBe(graph);
    });

    it('lays nothing over the canvas while there is a diagram and the source parses', async () => {
      const { container } = await renderWithVisibleFlows(
        withParseState(<DesignerVisualization entities={[entity]} />, ResourceParseState.Valid),
        map,
      );
      await waitFor(() => {
        expect(fromModelSpy).toHaveBeenCalled();
      });

      expect(container.querySelector('.canvas-overlay')).not.toBeInTheDocument();
    });

    it('shows the broken-file state instead of the empty state when the first document does not parse', async () => {
      await renderWithVisibleFlows(
        withParseState(<DesignerVisualization entities={[]} />, ResourceParseState.Error),
        map,
      );

      expect(await screen.findByTestId('broken-file-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    });
  });
});
