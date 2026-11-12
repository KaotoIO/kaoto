import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { action, isNode, Point, SELECTION_EVENT, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, RenderResult, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { CatalogModalContext } from '../../../dynamic-catalog/catalog-modal.provider';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../models';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { LocalStorageKeys } from '../../../models/local-storage-keys';
import { DefaultSettingsAdapter } from '../../../models/settings';
import { CanvasLayoutDirection } from '../../../models/settings/settings.model';
import { AddStepMode, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { ActionConfirmationModalContextProvider } from '../../../providers/action-confirmation-modal.provider';
import { SettingsProvider } from '../../../providers/settings.provider';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { kameletJson } from '../../../stubs/kamelet-route';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { useAddStep } from '../Custom/hooks/add-step.hook';
import { useInsertStep } from '../Custom/hooks/insert-step.hook';
import { useReplaceStep } from '../Custom/hooks/replace-step.hook';
import { buildDesignerCanvasModel } from '../designer-canvas-model';
import { Canvas } from './Canvas';
import { LayoutType } from './canvas.models';
import { COLLAPSE_STATE } from './collapse-handler-state';
import { ControllerService } from './controller.service';

function getCanvasPropsFromVizNodes(vizNodes: IVisualizationNode[], entitiesCount: number) {
  const { nodes, edges } = buildDesignerCanvasModel(vizNodes);
  return {
    nodes,
    edges,
    entitiesCount,
    visibleEntitiesCount: vizNodes.length,
    applyCollapseOnUpdate: true,
  };
}

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  async function renderCanvas() {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { Provider } = await TestProvidersWrapper();
    const vizNode = await entity.toVizNode();
    const controller = ControllerService.createController();

    const result = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
        </VisualizationProvider>
      </Provider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    return { ...result, Provider, vizNode, controller };
  }

  it('should render correctly', async () => {
    const result = await renderCanvas();

    await waitFor(async () => {
      expect(screen.getByText('Reset View')).toBeInTheDocument();
    });
    expect(result.asFragment()).toMatchSnapshot();
  });

  it('should keep the selection listener registered while selection changes rerender the canvas', async () => {
    const { container, controller } = await renderCanvas();
    const addSpy = vi.spyOn(controller, 'addEventListener');
    const removeSpy = vi.spyOn(controller, 'removeEventListener');

    act(() => {
      controller.fireEvent(SELECTION_EVENT, ['route-8888']);
    });
    expect(container.querySelector('.pf-m-expanded')).toBeInTheDocument();
    act(() => {
      controller.fireEvent(SELECTION_EVENT, []);
    });
    expect(container.querySelector('.pf-m-expanded')).not.toBeInTheDocument();
    expect(addSpy.mock.calls.filter(([type]) => type === SELECTION_EVENT)).toHaveLength(0);
    expect(removeSpy.mock.calls.filter(([type]) => type === SELECTION_EVENT)).toHaveLength(0);
  });

  it('should clear the selection when Escape is pressed on the canvas', async () => {
    const { container, controller } = await renderCanvas();

    // Fire the SELECTION_EVENT so the Canvas useEventListener hook updates its React state —
    // this opens the Drawer (sideBarOpen=true → Drawer isExpanded=true → pf-m-expanded CSS class)
    act(() => {
      controller.fireEvent(SELECTION_EVENT, ['route-8888']);
    });

    await waitFor(() => {
      expect(container.querySelector('.pf-m-expanded')).toBeInTheDocument();
    });

    // Press Escape on the canvas container — React synthetic event path (no document.addEventListener)
    fireEvent.keyDown(container.firstChild!, { key: 'Escape' });

    await waitFor(() => {
      expect(container.querySelector('.pf-m-expanded')).not.toBeInTheDocument();
    });
  });

  it('should move focus to the search input when sidebar opens', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    // Without a schema the side panel renders the node source instead of the form (and its search input)
    setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
    onTestFinished(() => {
      DynamicCatalogRegistry.get().clearRegistry();
    });
    const { controller } = await renderCanvas();

    // Open sidebar by selecting the timer `from` step — this resolves to a real vizNode
    act(() => {
      controller.fireEvent(SELECTION_EVENT, ['route-8888|route.from']);
    });

    // Sidebar search input should be in the document
    await waitFor(() => {
      expect(screen.getByTestId('filter-fields')).toBeInTheDocument();
    });

    // Flush requestAnimationFrame so the focus() call in the useEffect fires
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const searchInput = screen.getByTestId('filter-fields');
    expect(searchInput).toHaveFocus();
    // The drawer is still animating in, so focusing must not scroll its container (canvas jump)
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('should restore focus to the canvas container when the sidebar is closed via clearSelection', async () => {
    const { container, controller } = await renderCanvas();

    // Open sidebar by selecting the timer `from` step — this resolves to a real vizNode
    act(() => {
      controller.fireEvent(SELECTION_EVENT, ['route-8888|route.from']);
    });

    await waitFor(() => {
      expect(screen.getByTestId('close-side-bar')).toBeInTheDocument();
    });

    // Close via Escape keydown on canvas (triggers clearSelection which restores focus)
    fireEvent.keyDown(container.firstChild!, { key: 'Escape' });

    await waitFor(() => {
      expect(container.querySelector('.pf-m-expanded')).not.toBeInTheDocument();
    });

    // Flush requestAnimationFrame so the focus() call in clearSelection fires
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Focus should now be on the canvas container (id=canvas-main)
    const canvasEl = container.querySelector('[id="canvas-main"]');
    expect(canvasEl).toHaveFocus();
  });

  it('should close the sidebar and restore focus when Escape is pressed from the focused search input', async () => {
    // Without a schema the side panel renders the node source instead of the form (and its search input)
    setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
    onTestFinished(() => {
      DynamicCatalogRegistry.get().clearRegistry();
    });
    const { container, controller } = await renderCanvas();

    act(() => {
      controller.fireEvent(SELECTION_EVENT, ['route-8888|route.from']);
    });

    await waitFor(() => {
      expect(screen.getByTestId('filter-fields')).toBeInTheDocument();
    });

    // Flush requestAnimationFrame so the auto-focus fires
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const searchInput = screen.getByTestId('filter-fields');
    expect(searchInput).toHaveFocus();

    // The search is empty, so Escape dismisses the panel
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    await waitFor(() => {
      expect(container.querySelector('.pf-m-expanded')).not.toBeInTheDocument();
    });

    // Flush requestAnimationFrame so the focus() call in clearSelection fires
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(container.querySelector('[id="canvas-main"]')).toHaveFocus();
  });

  describe('focus return to the last step', () => {
    /** Two routes with the same step paths, so only the topology id tells their steps apart */
    async function buildTwoRoutes(secondRouteSteps = [{ log: { message: 'second' } }]) {
      const camelResource = new CamelRouteResource([
        { route: { id: 'route-first', from: { uri: 'timer:first', steps: [{ log: { message: 'first' } }] } } },
        { route: { id: 'route-second', from: { uri: 'timer:second', steps: secondRouteSteps } } },
      ]);
      await camelResource.initialize();
      const vizNodes = await Promise.all(camelResource.getVisualEntities().map((entity) => entity.toVizNode()));
      return { camelResource, canvasProps: getCanvasPropsFromVizNodes(vizNodes, 2) };
    }

    async function renderTwoRoutes() {
      const { camelResource, canvasProps } = await buildTwoRoutes();
      const { Provider } = await TestProvidersWrapper({ camelResource });
      const controller = ControllerService.createController();
      // jsdom has no viewport dimensions; keep the real node renderers mounted
      controller.setRenderConstraint(false);

      const renderWith = (props: typeof canvasProps) => (
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas {...props} />
          </VisualizationProvider>
        </Provider>
      );
      const result = render(renderWith(canvasProps));
      const flushFrames = () =>
        act(async () => {
          await vi.runAllTimersAsync();
        });
      await flushFrames();

      const step = (routeId: string, path: string) =>
        result.container.querySelector<SVGGElement>(`[data-id="${routeId}|${path}"] > g`)!;
      // Arrow-key navigation moves focus with element.focus(); hotkeys-js itself is mocked in unit tests
      const focusStep = (routeId: string, path: string) => {
        act(() => {
          step(routeId, path).focus();
        });
        return step(routeId, path);
      };
      // user.click() cannot be used on the graph: the d3 pan/drag handlers fail on mousedown in jsdom
      const clickBackground = async () => {
        fireEvent.click(result.container.querySelector('[data-kind="graph"] > rect')!);
        await flushFrames();
      };
      const deleteSecondLog = async () => {
        result.rerender(renderWith((await buildTwoRoutes([])).canvasProps));
        await flushFrames();
      };

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      return { ...result, user, focusStep, flushFrames, clickBackground, deleteSecondLog };
    }

    it('keeps focus on the selected step of its own route across repeated background clicks', async () => {
      const { user, focusStep, clickBackground } = await renderTwoRoutes();
      const secondLog = focusStep('route-second', 'route.from.steps.0.log');

      await user.keyboard('{Enter}');
      expect(await screen.findByTestId('close-side-bar')).toBeInTheDocument();

      for (let click = 0; click < 3; click++) {
        await clickBackground();
        expect(secondLog).toHaveFocus();
        expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
      }
    });

    it('keeps focus on a focused step without opening the properties', async () => {
      const { focusStep, clickBackground } = await renderTwoRoutes();
      const secondTimer = focusStep('route-second', 'route.from');

      await clickBackground();
      await clickBackground();

      expect(secondTimer).toHaveFocus();
      expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
    });

    it('returns focus to the selected step when the properties are closed with Escape', async () => {
      // Without a schema the side panel renders the node source instead of the form (and its search input)
      setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
      onTestFinished(() => {
        DynamicCatalogRegistry.get().clearRegistry();
      });
      const { user, focusStep, flushFrames } = await renderTwoRoutes();
      const secondLog = focusStep('route-second', 'route.from.steps.0.log');

      await user.keyboard('{Enter}');
      await flushFrames();
      expect(screen.getByTestId('filter-fields')).toHaveFocus();
      await user.keyboard('{Escape}');
      await flushFrames();

      expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
      expect(secondLog).toHaveFocus();
    });

    it('focuses the canvas when the last step was deleted', async () => {
      const { container, focusStep, clickBackground, deleteSecondLog } = await renderTwoRoutes();
      focusStep('route-second', 'route.from.steps.0.log');

      await deleteSecondLog();
      await clickBackground();

      expect(container.querySelector('#canvas-main')).toHaveFocus();
    });
  });

  it('should schedule a graph.fit(80) upon loading', async () => {
    // Cannot use renderCanvas() here: fitSpy and layoutSpy must be installed on controller.getGraph()
    // *after* render but *before* runAllTimersAsync — a timing requirement the helper does not support.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = await TestProvidersWrapper();
    const vizNode = await entity.toVizNode();
    const controller = ControllerService.createController();
    const fromModelSpy = vi.spyOn(controller, 'fromModel');

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
        </VisualizationProvider>
      </Provider>,
    );

    // The graph has been initialized with the .fromModel method, but the requestAnimationFrame
    // has not been called yet, so the graph.fit(80) is not called yet.
    const fitSpy = vi.spyOn(controller.getGraph(), 'fit');
    const layoutSpy = vi.spyOn(controller.getGraph(), 'layout');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(fromModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ graph: { id: 'g1', type: 'graph', layout: 'DagreVertical' } }),
      false,
    );
    expect(fitSpy).toHaveBeenCalledWith(80);

    // This won't be called the first time
    expect(fromModelSpy).not.toHaveBeenCalledWith(expect.anything(), true);
    expect(layoutSpy).not.toHaveBeenCalled();
  });

  it('merges a changed visualization model after initialization', async () => {
    const { Provider } = await TestProvidersWrapper();
    const controller = ControllerService.createController();
    const fromModelSpy = vi.spyOn(controller, 'fromModel');
    const vizNode = await entity.toVizNode();
    const updatedEntity = new CamelRouteVisualEntity({
      route: { ...camelRouteJson.route, id: 'route-updated' },
    });
    const updatedVizNode = await updatedEntity.toVizNode();

    // Stateful child so we can update entities without re-rendering Provider
    let setVizNodesState: (next: IVisualizationNode[]) => void = () => {};
    const Inner = () => {
      const [vizNodes, setVizNodes] = useState<IVisualizationNode[]>([vizNode]);
      setVizNodesState = setVizNodes;
      return (
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes(vizNodes, 1)} />
        </VisualizationProvider>
      );
    };

    render(
      <Provider>
        <Inner />
      </Provider>,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(fromModelSpy).toHaveBeenCalledWith(expect.anything(), false);

    fromModelSpy.mockClear();

    act(() => {
      setVizNodesState([updatedVizNode]);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(fromModelSpy).toHaveBeenCalledWith(expect.anything(), true);
    expect(fromModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([expect.objectContaining({ data: { vizNode: updatedVizNode } })]),
      }),
      true,
    );
    expect(
      controller.getElements().some((element) => isNode(element) && element.getData()?.vizNode === updatedVizNode),
    ).toBe(true);
  });

  it('should be able to delete the routes', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    await camelResource.initialize();
    const routeEntities = camelResource.getVisualEntities();
    const vizNode = await routeEntities[0].toVizNode();
    const removeSpy = vi.spyOn(camelResource, 'removeEntity');

    const { Provider } = await TestProvidersWrapper({
      camelResource,
    });

    const result = render(
      <ActionConfirmationModalContextProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
          </VisualizationProvider>
        </Provider>
      </ActionConfirmationModalContextProvider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const route = result?.getByText('route-8888');
    if (!route) {
      expect.unreachable('Route not found');
    }

    // Right click anywhere on the container label
    fireEvent.contextMenu(route);

    // Click the Delete ContextMenuItem
    const deleteRoute = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(deleteRoute).toBeInTheDocument();

    fireEvent.click(deleteRoute);

    // Deal with the Confirmation modal
    const deleteConfirmation = screen.getByRole('button', { name: 'Confirm' });
    expect(deleteConfirmation).toBeInTheDocument();

    await fireEvent.click(deleteConfirmation);

    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(['route-8888']);
  });

  it('should drop the previous context menu as soon as the node is right-clicked again', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    await camelResource.initialize();
    const vizNode = await camelResource.getVisualEntities()[0].toVizNode();

    const { Provider } = await TestProvidersWrapper({ camelResource });

    render(
      <Provider>
        <VisualizationProvider controller={ControllerService.createController()}>
          <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
        </VisualizationProvider>
      </Provider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const route = screen.getByText('route-8888');
    fireEvent.contextMenu(route);
    const firstDelete = await screen.findByRole('menuitem', { name: 'Delete' });

    fireEvent.contextMenu(route);

    /* The items of the first menu must not stay clickable while the second menu is being built (#3529) */
    expect(firstDelete).not.toBeInTheDocument();
    const secondDelete = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(secondDelete).not.toBe(firstDelete);
  });

  it('should be able to delete the kamelets', async () => {
    const kameletResource = new KameletResource(kameletJson);
    await kameletResource.initialize();
    const kameletEntities = kameletResource.getVisualEntities();
    const vizNode = await kameletEntities[0].toVizNode();
    const removeSpy = vi.spyOn(kameletResource, 'removeEntity');

    const { Provider } = await TestProvidersWrapper({
      camelResource: kameletResource,
    });

    const result = render(
      <ActionConfirmationModalContextProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
          </VisualizationProvider>
        </Provider>
      </ActionConfirmationModalContextProvider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const kamelet = result?.getByText('Produces periodic events about random users!');
    if (!kamelet) {
      expect.unreachable('Kamelet not found');
    }

    // Right click anywhere on the container label
    fireEvent.contextMenu(kamelet);

    // click the Delete ContextMenuItem
    const deleteKamelet = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(deleteKamelet).toBeInTheDocument();

    fireEvent.click(deleteKamelet);

    // Deal with the Confirmation modal
    const deleteConfirmation = screen.getByRole('button', { name: 'Confirm' });
    expect(deleteConfirmation).toBeInTheDocument();

    await fireEvent.click(deleteConfirmation);

    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
  });

  describe('Catalog button', () => {
    it('should be present if `CatalogModalContext` is provided', async () => {
      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      const result: RenderResult = render(
        <CatalogModalContext.Provider value={{ getNewComponent: vi.fn(), checkCompatibility: vi.fn() }}>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
            </VisualizationProvider>
          </Provider>
        </CatalogModalContext.Provider>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(async () => {
        expect(screen.getByText('Open Catalog')).toBeInTheDocument();
      });
      expect(result?.asFragment()).toMatchSnapshot();
    });

    it('should NOT be present if `CatalogModalContext` is NOT provided', async () => {
      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      const result = render(
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
          </VisualizationProvider>
        </Provider>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(async () => {
        expect(screen.queryByText('Open Catalog')).not.toBeInTheDocument();
      });
      expect(result?.asFragment()).toMatchSnapshot();
    });
  });

  describe('Active Layout Priority', () => {
    beforeEach(async () => {
      localStorage.clear();
    });

    const TEST_CASES = [
      {
        canvasLayoutDirection: CanvasLayoutDirection.Horizontal,
        layout: LayoutType.DagreHorizontal,
        activationFn: () => {},
      },
      {
        canvasLayoutDirection: CanvasLayoutDirection.Vertical,
        layout: LayoutType.DagreVertical,
        activationFn: () => {},
      },
      {
        canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
        layout: LayoutType.DagreHorizontal,
        activationFn: () => {
          localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
        },
      },
      {
        canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
        layout: LayoutType.DagreVertical,
        activationFn: () => {},
      },
    ];

    it.each(TEST_CASES)(
      'should use `$layout` layout when canvasLayoutDirection is set to `$canvasLayoutDirection`',
      async ({ canvasLayoutDirection, layout, activationFn }) => {
        activationFn();
        const settingsAdapter = new DefaultSettingsAdapter({ canvasLayoutDirection });
        const vizNode = await entity.toVizNode();

        const { Provider } = await TestProvidersWrapper();

        const controller = ControllerService.createController();
        const fromModelSpy = vi.spyOn(controller, 'fromModel');

        render(
          <SettingsProvider adapter={settingsAdapter}>
            <Provider>
              <VisualizationProvider controller={controller}>
                <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
              </VisualizationProvider>
            </Provider>
          </SettingsProvider>,
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(fromModelSpy).toHaveBeenCalledWith(
          expect.objectContaining({ graph: { id: 'g1', type: 'graph', layout } }),
          false,
        );
      },
    );
  });

  describe('Layout Toggle Buttons', () => {
    beforeEach(async () => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should update localStorage when horizontal layout button is clicked', async () => {
      const settingsAdapter = new DefaultSettingsAdapter({
        canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
      });

      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      const localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(
        <SettingsProvider adapter={settingsAdapter}>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
            </VisualizationProvider>
          </Provider>
        </SettingsProvider>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(screen.getByText('Layout nodes horizontally')).toBeInTheDocument();
      });

      const horizontalButton = screen.getByText('Layout nodes horizontally').closest('button')!;
      expect(horizontalButton).toBeInTheDocument();

      fireEvent.click(horizontalButton);

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
    });

    it('should update localStorage when vertical layout button is clicked', async () => {
      const settingsAdapter = new DefaultSettingsAdapter({
        canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
      });

      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      const localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(
        <SettingsProvider adapter={settingsAdapter}>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
            </VisualizationProvider>
          </Provider>
        </SettingsProvider>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(screen.getByText('Layout nodes vertically')).toBeInTheDocument();
      });

      const verticalButton = screen.getByText('Layout nodes vertically').closest('button')!;
      expect(verticalButton).toBeInTheDocument();

      fireEvent.click(verticalButton);

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.CanvasLayout, LayoutType.DagreVertical);
    });

    it.each([CanvasLayoutDirection.Horizontal, CanvasLayoutDirection.Vertical])(
      'should NOT show layout toggle buttons when canvasLayoutDirection is %s',
      async (canvasLayoutDirection) => {
        const settingsAdapter = new DefaultSettingsAdapter({ canvasLayoutDirection });

        const { Provider } = await TestProvidersWrapper();
        const vizNode = await entity.toVizNode();

        render(
          <SettingsProvider adapter={settingsAdapter}>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
              </VisualizationProvider>
            </Provider>
          </SettingsProvider>,
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(screen.queryByText('Layout nodes horizontally')).not.toBeInTheDocument();
        expect(screen.queryByText('Layout nodes vertically')).not.toBeInTheDocument();
      },
    );
  });

  it('reinitializes the graph when content resolves after a settled empty state', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();
    const controller = ControllerService.createController();
    const fromModelSpy = vi.spyOn(controller, 'fromModel');
    const vizNode = await entity.toVizNode();

    const { rerender } = render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas {...getCanvasPropsFromVizNodes([], 0)} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fromModelSpy.mockClear();

    rerender(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas {...getCanvasPropsFromVizNodes([], 1)} isModelResolving />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
    rerender(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(fromModelSpy).toHaveBeenCalledWith(expect.anything(), false);
    expect(fromModelSpy).not.toHaveBeenCalledWith(expect.anything(), true);
  });

  it('preserves collapse and viewport state through a resolving remount', async () => {
    const { Provider } = await TestProvidersWrapper();
    const controller = ControllerService.createController();
    const fromModelSpy = vi.spyOn(controller, 'fromModel');
    const vizNode = await entity.toVizNode();

    const { rerender } = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes([vizNode], 1)} />
        </VisualizationProvider>
      </Provider>,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const graph = controller.getGraph();
    const routeGroup = controller
      .getElements()
      .find(
        (element) =>
          isNode(element) &&
          (
            (element.getData()?.vizNode as IVisualizationNode | undefined)?.data?.definition as
              | { id?: string }
              | undefined
          )?.id === 'route-8888',
      );
    expect(routeGroup && isNode(routeGroup)).toBe(true);
    if (!routeGroup || !isNode(routeGroup)) {
      throw new Error('Expected route group was not found');
    }

    action(() => {
      routeGroup.setCollapsed(true);
      controller.setState({ [COLLAPSE_STATE]: ['route-8888'] });
      graph.setScale(1.5);
      graph.setPosition(new Point(120, 80));
    })();
    fromModelSpy.mockClear();

    rerender(
      <Provider>
        <VisualizationProvider controller={controller}>{null}</VisualizationProvider>
      </Provider>,
    );
    rerender(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes([], 1)} isModelResolving />
        </VisualizationProvider>
      </Provider>,
    );

    const refreshedVizNode = await entity.toVizNode();
    rerender(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas {...getCanvasPropsFromVizNodes([refreshedVizNode], 1)} />
        </VisualizationProvider>
      </Provider>,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(fromModelSpy).toHaveBeenCalledWith(expect.anything(), true);
    expect(fromModelSpy).not.toHaveBeenCalledWith(expect.anything(), false);
    expect(controller.getGraph()).toBe(graph);
    expect(graph.getScale()).toBe(1.5);
    expect(graph.getPosition()).toEqual(new Point(120, 80));

    const remountedRouteGroup = controller
      .getElements()
      .find(
        (element) =>
          isNode(element) &&
          (
            (element.getData()?.vizNode as IVisualizationNode | undefined)?.data?.definition as
              | { id?: string }
              | undefined
          )?.id === 'route-8888',
      );
    expect(remountedRouteGroup && isNode(remountedRouteGroup) && remountedRouteGroup.isCollapsed()).toBe(true);
  });

  it.each([
    [AddStepMode.ReplaceStep, 'route.from.steps.1.placeholder', 'route.from.steps.1.to'],
    [AddStepMode.PrependStep, 'route.from.steps.0.split', 'route.from.steps.0.to'],
    [AddStepMode.AppendStep, 'route.from.steps.0.split', 'route.from.steps.1.to'],
    [AddStepMode.InsertChildStep, 'route.from.steps.0.split', 'route.from.steps.0.split.steps.0.to'],
  ] as const)('selects an inserted Avro step and opens its properties (%s)', async (mode, targetPath, expectedPath) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
    onTestFinished(() => {
      DynamicCatalogRegistry.get().clearRegistry();
    });
    const resource = new CamelRouteResource([
      {
        route: {
          id: 'route-1',
          from: {
            uri: 'timer:test',
            steps: [{ split: { simple: '${body}', steps: [{ log: { message: 'Hello' } }] } }],
          },
        },
      },
    ]);
    const { Provider } = await TestProvidersWrapper({ camelResource: resource });
    const entity = resource.getVisualEntities()[0];
    const initial = getCanvasPropsFromVizNodes([await entity.toVizNode()], 1);
    const target = initial.nodes.find((node) => node.data?.vizNode?.data.path === targetPath)?.data?.vizNode;
    if (!target) throw new Error(`Insertion target not found: ${targetPath}`);
    const controller = ControllerService.createController();
    const catalog = {
      getNewComponent: vi.fn().mockResolvedValue({ type: CatalogKind.Component, name: 'avro' }),
      checkCompatibility: vi.fn(),
    };
    const InsertButton = () => {
      const addMode = mode === AddStepMode.PrependStep ? AddStepMode.PrependStep : AddStepMode.AppendStep;
      const { onAddStep } = useAddStep(target, addMode);
      const { onInsertStep } = useInsertStep(target);
      const { onReplaceNode } = useReplaceStep(target);
      const actions = {
        [AddStepMode.ReplaceStep]: onReplaceNode,
        [AddStepMode.InsertChildStep]: onInsertStep,
        [AddStepMode.AppendStep]: onAddStep,
        [AddStepMode.PrependStep]: onAddStep,
      };
      return <button onClick={actions[mode]}>Insert Avro</button>;
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>
        <CatalogModalContext.Provider value={catalog}>
          <VisualizationProvider controller={controller}>
            <InsertButton />
            {children}
          </VisualizationProvider>
        </CatalogModalContext.Provider>
      </Provider>
    );
    const { rerender } = render(<Canvas {...initial} />, { wrapper });
    expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();

    await user.click(screen.getByText('Insert Avro'));
    rerender(<Canvas nodes={[]} edges={[]} isModelResolving />);
    rerender(<Canvas {...getCanvasPropsFromVizNodes([await entity.toVizNode()], 1)} />);

    expect(await screen.findByTestId('close-side-bar')).toBeInTheDocument();
    expect(await screen.findByText('Avro RPC')).toBeInTheDocument();
    expect(controller.getState<{ selectedIds: string[] }>().selectedIds).toEqual([`route-1|${expectedPath}`]);

    fireEvent.click(screen.getByTestId('close-side-bar'));
    rerender(<Canvas {...getCanvasPropsFromVizNodes([await entity.toVizNode()], 1)} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
  });
});
