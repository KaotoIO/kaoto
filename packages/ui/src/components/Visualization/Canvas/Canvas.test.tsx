import { action, isNode, Point, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, RenderResult, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { CatalogModalContext } from '../../../dynamic-catalog/catalog-modal.provider';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { LocalStorageKeys } from '../../../models/local-storage-keys';
import { DefaultSettingsAdapter } from '../../../models/settings';
import { CanvasLayoutDirection } from '../../../models/settings/settings.model';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { ActionConfirmationModalContextProvider } from '../../../providers/action-confirmation-modal.provider';
import { SettingsProvider } from '../../../providers/settings.provider';
import { VisibleFlowsContextResult } from '../../../providers/visible-flows.provider';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { kameletJson } from '../../../stubs/kamelet-route';
import { Canvas } from './Canvas';
import { LayoutType } from './canvas.models';
import { COLLAPSE_STATE } from './collapse-handler-state';
import { ControllerService } from './controller.service';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should render correctly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = await TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas vizNodes={[vizNode]} entitiesCount={1} />
          </VisualizationProvider>
        </Provider>,
      );
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await waitFor(async () => {
      expect(screen.getByText('Reset View')).toBeInTheDocument();
    });
    expect(result?.asFragment()).toMatchSnapshot();
  });

  it('should schedule a graph.fit(80) upon loading', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = await TestProvidersWrapper();
    const vizNode = await entity.toVizNode();
    const controller = ControllerService.createController();
    const fromModelSpy = vi.spyOn(controller, 'fromModel');
    // Spy on the graph prototype before rendering: the async `getNodeValidationText` effects in the
    // custom nodes keep the render `act()` open long enough that the scheduled `requestAnimationFrame`
    // can fire during it. `fromModel` also swaps the graph instance, so we spy on the prototype to
    // capture the `fit` call regardless of which instance receives it or exactly when the frame fires.
    const graphPrototype = Object.getPrototypeOf(controller.getGraph());
    const fitSpy = vi.spyOn(graphPrototype, 'fit');
    const layoutSpy = vi.spyOn(graphPrototype, 'layout');

    await act(async () => {
      render(
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas vizNodes={[vizNode]} entitiesCount={1} />
          </VisualizationProvider>
        </Provider>,
      );
    });

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
          <Canvas vizNodes={vizNodes} entitiesCount={1} />
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

    await act(async () => {
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

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <ActionConfirmationModalContextProvider>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas vizNodes={[vizNode]} entitiesCount={1} />
            </VisualizationProvider>
          </Provider>
        </ActionConfirmationModalContextProvider>,
      );
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const route = result?.getByText('route-8888');
    if (!route) {
      fail('Route not found');
    }

    // Right click anywhere on the container label
    await act(async () => {
      fireEvent.contextMenu(route);
    });

    // Click the Delete ContextMenuItem
    const deleteRoute = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(deleteRoute).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteRoute);
    });

    // Deal with the Confirmation modal
    const deleteConfirmation = screen.getByRole('button', { name: 'Confirm' });
    expect(deleteConfirmation).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteConfirmation);
    });

    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(['route-8888']);
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

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <ActionConfirmationModalContextProvider>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas vizNodes={[vizNode]} entitiesCount={1} />
            </VisualizationProvider>
          </Provider>
        </ActionConfirmationModalContextProvider>,
      );
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const kamelet = result?.getByText('Produces periodic events about random users!');
    if (!kamelet) {
      fail('Kamelet not found');
    }

    // Right click anywhere on the container label
    await act(async () => {
      fireEvent.contextMenu(kamelet);
    });

    // click the Delete ContextMenuItem
    const deleteKamelet = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(deleteKamelet).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteKamelet);
    });

    // Deal with the Confirmation modal
    const deleteConfirmation = screen.getByRole('button', { name: 'Confirm' });
    expect(deleteConfirmation).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteConfirmation);
    });

    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
  });

  describe('Catalog button', () => {
    it('should be present if `CatalogModalContext` is provided', async () => {
      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <CatalogModalContext.Provider value={{ getNewComponent: vi.fn(), checkCompatibility: vi.fn() }}>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[vizNode]} entitiesCount={1} />
              </VisualizationProvider>
            </Provider>
          </CatalogModalContext.Provider>,
        );
      });

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

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas vizNodes={[vizNode]} entitiesCount={1} />
            </VisualizationProvider>
          </Provider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(async () => {
        expect(screen.queryByText('Open Catalog')).not.toBeInTheDocument();
      });
      expect(result?.asFragment()).toMatchSnapshot();
    });
  });

  describe('Empty state', () => {
    it('should render empty state when there is no visual viznode', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: {} } as unknown as VisibleFlowsContextResult,
      });

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <RuntimeProvider>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[]} entitiesCount={0} />
              </VisualizationProvider>
            </Provider>
          </RuntimeProvider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(async () => {
        expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();
      });
      expect(result?.asFragment()).toMatchSnapshot();
    });

    it('should render empty state when there is no visible flows', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();
      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <RuntimeProvider>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[]} entitiesCount={1} />
              </VisualizationProvider>
            </Provider>
          </RuntimeProvider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(async () => {
        expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();
      });
      expect(result?.container).toMatchSnapshot();
    });

    it('should not render all-flows-hidden empty state while viz nodes are still resolving', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();

      await act(async () => {
        render(
          <RuntimeProvider>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[]} entitiesCount={1} isVizNodesResolving />
              </VisualizationProvider>
            </Provider>
          </RuntimeProvider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
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

        await act(async () => {
          render(
            <SettingsProvider adapter={settingsAdapter}>
              <Provider>
                <VisualizationProvider controller={controller}>
                  <Canvas vizNodes={[vizNode]} entitiesCount={1} />
                </VisualizationProvider>
              </Provider>
            </SettingsProvider>,
          );
        });

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

      await act(async () => {
        render(
          <SettingsProvider adapter={settingsAdapter}>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[vizNode]} entitiesCount={1} />
              </VisualizationProvider>
            </Provider>
          </SettingsProvider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(screen.getByText('Horizontal Layout')).toBeInTheDocument();
      });

      const horizontalButton = screen.getByText('Horizontal Layout').closest('button')!;
      expect(horizontalButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(horizontalButton);
      });

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);

      localStorageSetItemSpy.mockRestore();
    });

    it('should update localStorage when vertical layout button is clicked', async () => {
      const settingsAdapter = new DefaultSettingsAdapter({
        canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
      });

      const { Provider } = await TestProvidersWrapper();
      const vizNode = await entity.toVizNode();

      const localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      await act(async () => {
        render(
          <SettingsProvider adapter={settingsAdapter}>
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas vizNodes={[vizNode]} entitiesCount={1} />
              </VisualizationProvider>
            </Provider>
          </SettingsProvider>,
        );
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(screen.getByText('Vertical Layout')).toBeInTheDocument();
      });

      const verticalButton = screen.getByText('Vertical Layout').closest('button')!;
      expect(verticalButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(verticalButton);
      });

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.CanvasLayout, LayoutType.DagreVertical);

      localStorageSetItemSpy.mockRestore();
    });

    it.each([CanvasLayoutDirection.Horizontal, CanvasLayoutDirection.Vertical])(
      'should NOT show layout toggle buttons when canvasLayoutDirection is %s',
      async (canvasLayoutDirection) => {
        const settingsAdapter = new DefaultSettingsAdapter({ canvasLayoutDirection });

        const { Provider } = await TestProvidersWrapper();
        const vizNode = await entity.toVizNode();

        await act(async () => {
          render(
            <SettingsProvider adapter={settingsAdapter}>
              <Provider>
                <VisualizationProvider controller={ControllerService.createController()}>
                  <Canvas vizNodes={[vizNode]} entitiesCount={1} />
                </VisualizationProvider>
              </Provider>
            </SettingsProvider>,
          );
        });

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(screen.queryByText('Horizontal Layout')).not.toBeInTheDocument();
        expect(screen.queryByText('Vertical Layout')).not.toBeInTheDocument();
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
            <Canvas vizNodes={[]} entitiesCount={0} />
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
            <Canvas vizNodes={[]} entitiesCount={1} isVizNodesResolving />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
    rerender(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas vizNodes={[vizNode]} entitiesCount={1} />
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
          <Canvas vizNodes={[vizNode]} entitiesCount={1} />
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
          (element.getData()?.vizNode as IVisualizationNode | undefined)?.getNodeDefinition()?.id === 'route-8888',
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
          <Canvas vizNodes={[]} entitiesCount={1} isVizNodesResolving />
        </VisualizationProvider>
      </Provider>,
    );

    const refreshedVizNode = await entity.toVizNode();
    rerender(
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas vizNodes={[refreshedVizNode]} entitiesCount={1} />
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
          (element.getData()?.vizNode as IVisualizationNode | undefined)?.getNodeDefinition()?.id === 'route-8888',
      );
    expect(remountedRouteGroup && isNode(remountedRouteGroup) && remountedRouteGroup.isCollapsed()).toBe(true);
  });
});
