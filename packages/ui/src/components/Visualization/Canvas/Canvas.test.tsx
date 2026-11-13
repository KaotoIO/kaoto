import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { action, isNode, Point, SELECTION_EVENT, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, RenderResult, screen, waitFor, within } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { Fragment, FunctionComponent, PropsWithChildren, useState } from 'react';

import { CatalogModalContext, CatalogModalProvider } from '../../../dynamic-catalog/catalog-modal.provider';
import { CatalogTilesProvider } from '../../../dynamic-catalog/catalog-tiles.provider';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../models';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { EntityType } from '../../../models/entities';
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
import { Canvas, GRAPH_BACKGROUND, GRAPH_CONTENT } from './Canvas';
import { CanvasDefaults } from './canvas.defaults';
import { LayoutType } from './canvas.models';
import { COLLAPSE_STATE } from './collapse-handler-state';
import { ControllerService } from './controller.service';
import { EmptyCanvas } from './EmptyCanvas';

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

  it('finds the PatternFly elements the canvas relies on', async () => {
    const { container } = await renderCanvas();
    const canvas = container.querySelector(`#${CanvasDefaults.CANVAS_MAIN_ID}`)!;

    expect(canvas.querySelector(GRAPH_BACKGROUND)).toBeInTheDocument();
    expect(canvas.querySelector(GRAPH_CONTENT)).toBeInTheDocument();
    expect(canvas.querySelector('[data-test-id="topology"]')).toBeInTheDocument();
    // Hidden by Canvas.scss until the graph is fitted to the view
    expect(canvas.querySelector('.pf-topology-visualization-surface')).toBeInTheDocument();
  });

  it.each([
    [0, 'There are no routes defined'],
    [1, 'There are no visible routes'],
  ])('shows the empty state for %i routes over the canvas and describes the canvas with it', async (count, title) => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();
    render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas nodes={[]} edges={[]}>
              <EmptyCanvas entitiesNumber={count} />
            </Canvas>
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );

    const canvas = screen.getByRole('generic', { name: 'Route canvas', description: title });
    expect(within(canvas).getByTestId('visualization-empty-state')).toHaveTextContent(title);
    expect(within(canvas).getByRole('button', { name: 'Reset View' })).toBeInTheDocument();
  });

  it('keeps the canvas and its toolbars in sight while the first model resolves', async () => {
    const { Provider } = await TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <VisualizationProvider controller={ControllerService.createController()}>
          <Canvas nodes={[]} edges={[]} isModelResolving contextToolbar={<button>Context toolbar</button>} />
        </VisualizationProvider>
      </Provider>,
    );

    expect(screen.getByRole('button', { name: 'Context toolbar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom In' })).toBeInTheDocument();
    /* Only the graph waits for its first layout */
    expect(container.querySelector('#canvas-main')).toHaveClass('canvas-uninitialized');
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

    async function renderTwoRoutes(Wrapper: FunctionComponent<PropsWithChildren> = Fragment) {
      const { camelResource, canvasProps } = await buildTwoRoutes();
      const { canvasProps: withoutSecondLog } = await buildTwoRoutes([]);
      const { Provider } = await TestProvidersWrapper({ camelResource });
      const controller = ControllerService.createController();
      // jsdom has no viewport dimensions; keep the real node renderers mounted
      controller.setRenderConstraint(false);

      const renderWith = (props: typeof canvasProps & { isModelResolving?: boolean }) => (
        <Provider>
          <Wrapper>
            <VisualizationProvider controller={controller}>
              <Canvas {...props} />
            </VisualizationProvider>
          </Wrapper>
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
      // user.click() cannot be used on the graph: the d3 pan/drag handlers fail on mousedown in jsdom.
      // A real mousedown on the background moves the focus to the canvas first, so the click has to restore it.
      const clickBackground = async () => {
        act(() => {
          result.container.querySelector<HTMLElement>('#canvas-main')!.focus();
        });
        fireEvent.click(result.container.querySelector('[data-kind="graph"] > rect')!);
        await flushFrames();
      };
      // Deleting a step re-renders the canvas without it; the test model is not wired to the canvas props
      const deleteSecondLog = async () => {
        result.rerender(renderWith(withoutSecondLog));
        await flushFrames();
      };

      // The canvas keeps the previous graph while the visualization resolves the changed model
      const setModelResolving = async (isModelResolving: boolean) => {
        result.rerender(renderWith({ ...canvasProps, isModelResolving }));
        await flushFrames();
      };

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      return {
        ...result,
        camelResource,
        user,
        focusStep,
        flushFrames,
        clickBackground,
        deleteSecondLog,
        setModelResolving,
      };
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
      // Without a schema the side panel renders the node source instead of the form (and its search input).
      // A stubbed schema avoids loading the full catalog.
      vi.spyOn(CamelRouteVisualEntity.prototype, 'fetchNodeSchema').mockResolvedValue({
        type: 'object',
        properties: { message: { type: 'string', title: 'Message' } },
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

    it('returns focus to the selected step when the properties are closed with the close button', async () => {
      const { user, focusStep, flushFrames } = await renderTwoRoutes();
      const secondLog = focusStep('route-second', 'route.from.steps.0.log');

      await user.keyboard('{Enter}');
      await user.click(await screen.findByTestId('close-side-bar'));
      await flushFrames();

      expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
      expect(secondLog).toHaveFocus();
    });

    it('focuses the canvas on a background click before any step was focused', async () => {
      const { container, clickBackground } = await renderTwoRoutes();

      await clickBackground();

      expect(container.querySelector('#canvas-main')).toHaveFocus();
    });

    it('focuses the canvas when the last step was deleted', async () => {
      const { container, focusStep, clickBackground, deleteSecondLog } = await renderTwoRoutes();
      focusStep('route-second', 'route.from.steps.0.log');

      await deleteSecondLog();
      await clickBackground();

      expect(container.querySelector('#canvas-main')).toHaveFocus();
    });

    describe('canvas context menus with the keyboard', () => {
      const SHIFT_F10 = '{Shift>}{F10}{/Shift}';

      beforeEach(() => {
        // jsdom has no navigator.permissions, so the paste actions warn every time the step menu opens
        vi.spyOn(console, 'warn').mockImplementation(() => {});
      });

      async function openSecondLogMenu(key = SHIFT_F10, Wrapper?: FunctionComponent<PropsWithChildren>) {
        const rendered = await renderTwoRoutes(Wrapper);
        const secondLog = rendered.focusStep('route-second', 'route.from.steps.0.log');
        await rendered.user.keyboard(key);
        await rendered.flushFrames();
        const menu = screen.getByRole('menu', { name: 'Step actions' });
        return { ...rendered, secondLog, menu, items: within(menu).getAllByRole('menuitem') };
      }

      it('ignores input on the previous graph while the model resolves, keeping the focus on its step', async () => {
        const { user, focusStep, flushFrames, setModelResolving } = await renderTwoRoutes();
        const secondLog = focusStep('route-second', 'route.from.steps.0.log');

        await setModelResolving(true);
        await user.keyboard(SHIFT_F10);
        fireEvent.contextMenu(secondLog);
        await flushFrames();

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(secondLog).toHaveFocus();

        await setModelResolving(false);
        await user.keyboard(SHIFT_F10);
        await flushFrames();

        expect(screen.getByRole('menu', { name: 'Step actions' })).toBeInTheDocument();
      });

      it('does not open the canvas menu with Shift+F10 on the canvas while the model resolves', async () => {
        const { user, flushFrames, container, setModelResolving } = await renderTwoRoutes();
        await user.tab();
        const canvas = container.querySelector('#canvas-main');
        expect(canvas).toHaveFocus();

        await setModelResolving(true);
        await user.keyboard(SHIFT_F10);
        await flushFrames();

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(canvas).toHaveAttribute('aria-busy', 'true');

        await setModelResolving(false);
        expect(canvas).toHaveAttribute('aria-busy', 'false');
      });

      it.each([SHIFT_F10, '{ContextMenu}'])(
        'opens the step menu with %s and focuses its first enabled action',
        async (key) => {
          const { items } = await openSecondLogMenu(key);

          expect(items[0]).toHaveFocus();
        },
      );

      it('focuses the canvas when a menu opened by a right-click with nothing focused closes', async () => {
        const { user, flushFrames, container } = await renderTwoRoutes();
        expect(document.body).toHaveFocus();
        fireEvent.contextMenu(container.querySelector('[data-kind="graph"] > rect')!);
        await flushFrames();
        const menu = screen.getByRole('menu', { name: 'Canvas actions' });

        await user.keyboard('{Escape}');
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(container.querySelector('#canvas-main')).toHaveFocus();
      });

      it('opens the canvas menu with Shift+F10 on the canvas', async () => {
        const { user, flushFrames, container } = await renderTwoRoutes();
        await user.tab();
        expect(container.querySelector('#canvas-main')).toHaveFocus();

        await user.keyboard(SHIFT_F10);
        await flushFrames();

        const menu = screen.getByRole('menu', { name: 'Canvas actions' });
        expect(within(menu).getByRole('menuitem', { name: 'Show all' })).toHaveFocus();
      });

      async function openCanvasMenuOnNew() {
        const rendered = await renderTwoRoutes();
        await rendered.user.tab();
        await rendered.user.keyboard(SHIFT_F10);
        await rendered.flushFrames();
        await rendered.user.keyboard('{End}');
        const menu = screen.getByRole('menu', { name: 'Canvas actions' });
        const newItem = within(menu).getByRole('menuitem', { name: 'New' });
        expect(newItem).toHaveFocus();
        return { ...rendered, menu, newItem };
      }

      const menuItemOf = (testId: string) => within(screen.getByTestId(testId)).getByRole('menuitem');

      it('announces New as a submenu and enters it with ArrowRight, Enter and Space', async () => {
        const { user, newItem } = await openCanvasMenuOnNew();
        expect(newItem).toHaveAttribute('aria-haspopup', 'menu');

        for (const key of ['{ArrowRight}', '{Enter}', ' ']) {
          expect(newItem).toHaveAttribute('aria-expanded', 'false');
          await user.keyboard(key);

          expect(newItem).toHaveAttribute('aria-expanded', 'true');
          const subMenu = screen.getByRole('menu', { name: 'New' });
          expect(within(subMenu).getAllByRole('menuitem')[0]).toHaveFocus();
          await user.keyboard('{ArrowLeft}');
        }
      });

      it('opens New with Space once the key is released, without choosing the first action', async () => {
        const { user, flushFrames, camelResource, newItem } = await openCanvasMenuOnNew();
        const routes = camelResource.getVisualEntities().length;

        await user.keyboard('[Space>]');
        expect(newItem).toHaveAttribute('aria-expanded', 'false');
        await user.keyboard('[/Space]');
        await flushFrames();

        expect(newItem).toHaveAttribute('aria-expanded', 'true');
        expect(menuItemOf('new-entity-route')).toHaveFocus();
        expect(camelResource.getVisualEntities()).toHaveLength(routes);
      });

      it('leaves the submenu with ArrowLeft and Escape back to New', async () => {
        const { user, flushFrames, menu, newItem } = await openCanvasMenuOnNew();

        for (const key of ['{ArrowLeft}', '{Escape}']) {
          await user.keyboard('{ArrowRight}');
          expect(menuItemOf('new-entity-route')).toHaveFocus();

          await user.keyboard(key);
          await flushFrames();

          expect(screen.queryByRole('menu', { name: 'New' })).not.toBeInTheDocument();
          expect(newItem).toHaveAttribute('aria-expanded', 'false');
          expect(newItem).toHaveFocus();
          expect(menu).toBeInTheDocument();
        }
      });

      it.each([
        ['ArrowRight', (user: UserEvent) => user.keyboard('{ArrowRight}')],
        ['a click on New', (user: UserEvent, newItem: HTMLElement) => user.click(newItem)],
      ])('closes all menus on a click outside after entering New with %s', async (_, enterNew) => {
        const { user, flushFrames, menu, newItem } = await openCanvasMenuOnNew();
        await enterNew(user, newItem);
        expect(menuItemOf('new-entity-route')).toHaveFocus();

        await user.click(document.body);
        await flushFrames();

        expect(screen.queryByRole('menu', { name: 'New' })).not.toBeInTheDocument();
        expect(menu).not.toBeInTheDocument();
      });

      it('closes all menus on a click outside while the pointer leaves the submenu', async () => {
        const { user, flushFrames, container, menu, newItem } = await openCanvasMenuOnNew();
        await user.click(newItem);
        expect(menuItemOf('new-entity-route')).toHaveFocus();
        const background = container.querySelector('[data-kind="graph"] > rect')!;

        // In the browser, the submenu closed by the pointer leaving it may be removed only after the outside mousedown
        // d3 cannot handle a mousedown on the graph in jsdom; the click lands on the page instead
        fireEvent.mouseDown(document.body);
        fireEvent.mouseLeave(newItem, { relatedTarget: background });
        fireEvent.click(document.body);
        await flushFrames();

        expect(screen.queryByRole('menu', { name: 'New' })).not.toBeInTheDocument();
        expect(menu).not.toBeInTheDocument();
      });

      it.each([
        ['ArrowRight', (user: UserEvent) => user.keyboard('{ArrowRight}')],
        ['a click on New', (user: UserEvent, newItem: HTMLElement) => user.click(newItem)],
      ])('opens a new canvas menu on a right-click after entering New with %s', async (_, enterNew) => {
        const { user, flushFrames, container, menu, newItem } = await openCanvasMenuOnNew();
        await enterNew(user, newItem);
        expect(menuItemOf('new-entity-route')).toHaveFocus();

        // A right-click is a mousedown outside the menu, followed by the contextmenu event
        fireEvent.mouseDown(document.body);
        fireEvent.contextMenu(container.querySelector('[data-kind="graph"] > rect')!);
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        const newMenu = screen.getByRole('menu', { name: 'Canvas actions' });
        expect(within(newMenu).getByRole('menuitem', { name: 'Show all' })).toHaveFocus();
      });

      it('closes all menus on a click on an action that does not take the focus out of the submenu', async () => {
        const { user, flushFrames, menu } = await openCanvasMenuOnNew();
        await user.keyboard('{ArrowRight}');
        expect(menuItemOf('new-entity-route')).toHaveFocus();

        // Firefox and Safari do not focus a clicked button
        fireEvent.click(within(menu).getByRole('menuitem', { name: 'Show all' }));
        await flushFrames();

        expect(screen.queryByRole('menu', { name: 'New' })).not.toBeInTheDocument();
        expect(menu).not.toBeInTheDocument();
      });

      it('creates a route from the keyboard via New ▸ Route', async () => {
        const { user, flushFrames, container, camelResource, menu } = await openCanvasMenuOnNew();
        const routes = camelResource.getVisualEntities().length;

        await user.keyboard('{ArrowRight}{End}{Home}');
        expect(menuItemOf('new-entity-route')).toHaveFocus();
        await user.keyboard('{Enter}');
        await flushFrames();

        expect(camelResource.getVisualEntities()).toHaveLength(routes + 1);
        expect(menu).not.toBeInTheDocument();
        expect(container.querySelector('#canvas-main')).toHaveFocus();
      });

      it('creates a grouped entity with the keyboard and the mouse', async () => {
        const { user, flushFrames, container, camelResource, menu } = await openCanvasMenuOnNew();
        const countRouteConfigurations = () =>
          camelResource.getEntities().filter(({ type }) => type === EntityType.RouteConfiguration).length;

        await user.keyboard('{ArrowRight}');
        const configuration = within(screen.getByRole('menu', { name: 'New' })).getByRole('menuitem', {
          name: 'Configuration',
        });
        await user.keyboard('{ArrowDown}');
        expect(configuration).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(menuItemOf('new-entity-routeConfiguration')).toHaveFocus();
        await user.keyboard('{Enter}');
        await flushFrames();

        expect(countRouteConfigurations()).toBe(1);
        expect(menu).not.toBeInTheDocument();
        expect(container.querySelector('#canvas-main')).toHaveFocus();

        await user.keyboard(SHIFT_F10);
        await flushFrames();
        await user.hover(
          within(screen.getByRole('menu', { name: 'Canvas actions' })).getByRole('menuitem', { name: 'New' }),
        );
        await user.hover(screen.getByRole('menuitem', { name: 'Configuration' }));
        await user.click(menuItemOf('new-entity-routeConfiguration'));
        await flushFrames();

        expect(countRouteConfigurations()).toBe(2);
        expect(screen.queryByRole('menu', { name: 'Canvas actions' })).not.toBeInTheDocument();
      });

      it('separates the step actions with list items', async () => {
        const { menu } = await openSecondLogMenu();

        expect(within(menu).getAllByRole('separator').length).toBeGreaterThan(0);
        expect(menu.querySelectorAll(':scope > :not(li)')).toHaveLength(0);
      });

      it('moves between actions with the arrow keys, Home and End', async () => {
        const { user, items } = await openSecondLogMenu();

        await user.keyboard('{ArrowDown}');
        expect(items[1]).toHaveFocus();
        await user.keyboard('{ArrowUp}');
        expect(items[0]).toHaveFocus();
        await user.keyboard('{End}');
        expect(items.at(-1)).toHaveFocus();
        await user.keyboard('{Home}');
        expect(items[0]).toHaveFocus();
      });

      it.each(['{Escape}', '{Tab}'])('returns focus to the step on %s', async (key) => {
        const { user, flushFrames, secondLog, menu, items } = await openSecondLogMenu();
        expect(items[0]).toHaveFocus();

        await user.keyboard(key);
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(secondLog).toHaveFocus();
      });

      it('returns focus to the step as soon as an action is chosen, so a dialog the action opens can return to it', async () => {
        const { user, secondLog, menu } = await openSecondLogMenu();
        const copy = within(menu).getByRole('menuitem', { name: 'Copy' });
        act(() => {
          copy.focus();
        });
        // Hold back the next frame: a dialog like the catalog opens before it and takes the focus
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);

        await user.keyboard('{Enter}');

        expect(menu).not.toBeInTheDocument();
        expect(secondLog).toHaveFocus();
      });

      it('returns focus to the step when a click outside lands on nothing focusable', async () => {
        const { user, flushFrames, secondLog, menu, items } = await openSecondLogMenu();
        expect(items[0]).toHaveFocus();

        await user.click(document.body);
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(secondLog).toHaveFocus();
      });

      it('leaves focus on a focusable element that a click outside landed on', async () => {
        const { user, flushFrames, menu } = await openSecondLogMenu();
        const zoomIn = screen.getByRole('button', { name: 'Zoom In' });

        await user.click(zoomIn);
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(zoomIn).toHaveFocus();
      });

      it('closes only the menu on Escape while the properties are open', async () => {
        const { user, flushFrames, focusStep } = await renderTwoRoutes();
        focusStep('route-second', 'route.from.steps.0.log');
        await user.keyboard('{Enter}');
        expect(await screen.findByTestId('close-side-bar')).toBeInTheDocument();
        focusStep('route-second', 'route.from.steps.0.log');
        await user.keyboard(SHIFT_F10);
        await flushFrames();
        const menu = screen.getByRole('menu', { name: 'Step actions' });
        expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus();

        await user.keyboard('{Escape}');
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(screen.getByTestId('close-side-bar')).toBeInTheDocument();
      });

      it('focuses the canvas when the action removed the step', async () => {
        const { user, container, deleteSecondLog, menu } = await openSecondLogMenu();
        const deleteItem = within(menu).getByRole('menuitem', { name: 'Delete' });

        await user.keyboard('{End}');
        expect(deleteItem).toHaveFocus();
        // The app re-renders the canvas without the step before the next frame; user.keyboard() would let it pass
        fireEvent.keyDown(deleteItem, { key: 'Enter' });
        await deleteSecondLog();

        expect(menu).not.toBeInTheDocument();
        expect(container.querySelector('#canvas-main')).toHaveFocus();
      });

      it('keeps focus in a dialog opened by the action', async () => {
        setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
        onTestFinished(() => {
          DynamicCatalogRegistry.get().clearRegistry();
        });
        const CatalogModal: FunctionComponent<PropsWithChildren> = ({ children }) => (
          <CatalogTilesProvider>
            <CatalogModalProvider>{children}</CatalogModalProvider>
          </CatalogTilesProvider>
        );
        const { user, flushFrames, menu } = await openSecondLogMenu(SHIFT_F10, CatalogModal);
        const replaceItem = within(menu).getByRole('menuitem', { name: 'Replace' });

        await user.keyboard('{End}{ArrowUp}');
        expect(replaceItem).toHaveFocus();
        await user.keyboard('{Enter}');
        const dialog = await screen.findByRole('dialog');
        await flushFrames();

        expect(menu).not.toBeInTheDocument();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      });
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
