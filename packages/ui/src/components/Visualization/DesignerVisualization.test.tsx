import { isNode, Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MockInstance } from 'vitest';

import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
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

    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const result = render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>{ui}</VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );

    return {
      ...result,
      rerender: (newUi: ReactElement) => {
        result.rerender(
          <RuntimeProvider>
            <Provider>
              <VisualizationProvider controller={controller}>{newUi}</VisualizationProvider>
            </Provider>
          </RuntimeProvider>,
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
    /* The canvas stays mounted below the empty state, with an empty model */
    await waitFor(() => {
      expect(fromModelSpy).toHaveBeenCalled();
    });
    expect(getDrawnIds()).toEqual({ nodeIds: [], edgeIds: [] });
  });

  describe('switching between the empty and the populated canvas', () => {
    it('keeps the same canvas element', async () => {
      const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[entity]} />, map);
      await waitFor(() => {
        expect(fromModelSpy).toHaveBeenCalled();
      });
      const canvas = container.querySelector('#canvas-main');
      expect(canvas).toBeInTheDocument();

      for (let cycle = 0; cycle < 3; cycle++) {
        rerender(<DesignerVisualization entities={[]} />);
        expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
        expect(container.querySelector('#canvas-main')).toBe(canvas);

        rerender(<DesignerVisualization entities={[entity]} />);
        await waitFor(() => {
          expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
        });
        expect(container.querySelector('#canvas-main')).toBe(canvas);
      }
    });

    it('describes the empty canvas with the empty state title', async () => {
      const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[]} />, map);

      const title = await screen.findByText('There are no routes defined');
      expect(title).toHaveAttribute('id', 'canvas-empty-state-title');
      expect(container.querySelector('#canvas-main')).toHaveAttribute('aria-describedby', 'canvas-empty-state-title');

      rerender(<DesignerVisualization entities={[entity]} />);
      await waitFor(() => {
        expect(container.querySelector('#canvas-main')).not.toHaveAttribute('aria-describedby');
      });
    });

    it('keeps the focus on an empty state control on Escape', async () => {
      await renderWithVisibleFlows(<DesignerVisualization entities={[]} />, map);
      const newButton = within(await screen.findByTestId('visualization-empty-state')).getAllByRole('button')[0];
      act(() => {
        newButton.focus();
      });

      fireEvent.keyDown(newButton, { key: 'Escape' });
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });

      expect(newButton).toHaveFocus();
    });
  });

  describe('focus rescue', () => {
    /** The shared test setup replaces MutationObserver with a no-op; the test reports DOM changes itself */
    let observers: (() => void)[] = [];
    const notify = () => {
      for (const callback of observers) callback();
    };
    beforeEach(() => {
      observers = [];
      vi.spyOn(globalThis, 'MutationObserver').mockImplementation(function (callback) {
        const observer = { observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn() };
        observers.push(() => {
          callback([], observer as unknown as MutationObserver);
        });
        return observer;
      });
    });

    it('moves the focus to the canvas when the focused empty state control disappears', async () => {
      const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[]} />, map);
      const newButton = within(await screen.findByTestId('visualization-empty-state')).getAllByRole('button')[0];
      act(() => {
        newButton.focus();
      });

      rerender(<DesignerVisualization entities={[entity]} />);
      await waitFor(() => {
        expect(newButton).not.toBeInTheDocument();
      });
      act(() => {
        notify();
      });

      expect(document.activeElement).toBe(container.querySelector('#canvas-main'));
    });

    it('keeps the focus on the canvas across repeated empty and populated cycles', async () => {
      const { container, rerender } = await renderWithVisibleFlows(<DesignerVisualization entities={[]} />, map);
      const canvas = () => container.querySelector('#canvas-main');

      for (let cycle = 0; cycle < 3; cycle++) {
        const emptyStateButton = within(await screen.findByTestId('visualization-empty-state')).getAllByRole(
          'button',
        )[0];
        act(() => {
          emptyStateButton.focus();
        });

        // The routes come back: the empty state control disappears and hands the focus to the canvas
        rerender(<DesignerVisualization entities={[entity]} />);
        await waitFor(() => {
          expect(emptyStateButton).not.toBeInTheDocument();
        });
        act(() => {
          notify();
        });
        expect(document.activeElement).toBe(canvas());

        // The routes go away again: the canvas stays mounted and keeps the focus
        rerender(<DesignerVisualization entities={[]} />);
        expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
        act(() => {
          notify();
        });
        expect(document.activeElement).toBe(canvas());
      }
    });

    it('keeps the focus on a toolbar control when the routes disappear', async () => {
      const toolbar = <button data-testid="toolbar-button">Hide all</button>;
      const { rerender } = await renderWithVisibleFlows(
        <DesignerVisualization entities={[entity]} contextToolbar={toolbar} />,
        map,
      );
      const toolbarButton = await screen.findByTestId('toolbar-button');
      act(() => {
        toolbarButton.focus();
      });

      rerender(<DesignerVisualization entities={[]} contextToolbar={toolbar} />);
      expect(await screen.findByTestId('visualization-empty-state')).toBeInTheDocument();
      act(() => {
        notify();
      });

      expect(toolbarButton).toHaveFocus();
    });
  });
});
