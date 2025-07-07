import { VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, RenderResult, screen, waitFor } from '@testing-library/react';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { ActionConfirmationModalContextProvider } from '../../../providers';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFlowsContextResult } from '../../../providers/visible-flows.provider';
import { TestProvidersWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { kameletJson } from '../../../stubs/kamelet-route';
import { Canvas } from './Canvas';
import { ControllerService } from './controller.service';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);
  const entity2 = { ...entity, id: 'route-9999' } as CamelRouteVisualEntity;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render correctly', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFlowsContextResult,
    });

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas entities={[entity]} />
          </VisualizationProvider>
        </Provider>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(async () => expect(screen.getByText('Reset View')).toBeInTheDocument());
    expect(result?.asFragment()).toMatchSnapshot();
  });

  it('should render correctly with more routes ', async () => {
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: {
        visibleFlows: { ['route-8888']: true, ['route-9999']: false },
      } as unknown as VisibleFlowsContextResult,
    });

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <Canvas entities={[entity, entity2]} />
          </VisualizationProvider>
        </Provider>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(async () => expect(screen.getByText('Reset View')).toBeInTheDocument());
    expect(result?.asFragment()).toMatchSnapshot();
  });

  it('should schedule a graph.fit(80) upon loading', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFlowsContextResult,
    });
    const controller = ControllerService.createController();
    const fromModelSpy = jest.spyOn(controller, 'fromModel');

    await act(async () => {
      render(
        <Provider>
          <VisualizationProvider controller={controller}>
            <Canvas entities={[entity]} />
          </VisualizationProvider>
        </Provider>,
      );
    });

    // The graph has been initialized with the .fromModel method, but the requestAnimationFrame
    // has not been called yet, so the graph.fit(80) is not called yet.
    const fitSpy = jest.spyOn(controller.getGraph(), 'fit');
    const layoutSpy = jest.spyOn(controller.getGraph(), 'layout');

    await act(async () => {
      await jest.runAllTimersAsync();
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

  it('should be able to delete the routes', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const routeEntities = camelResource.getVisualEntities();
    const removeSpy = jest.spyOn(camelResource, 'removeEntity');

    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: { ['route-8888']: true },
      } as unknown as VisibleFlowsContextResult,
    });

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <ActionConfirmationModalContextProvider>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas entities={routeEntities} />
            </VisualizationProvider>
          </Provider>
        </ActionConfirmationModalContextProvider>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
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
    const kameletEntities = kameletResource.getVisualEntities();
    const removeSpy = jest.spyOn(kameletResource, 'removeEntity');

    const { Provider } = TestProvidersWrapper({
      camelResource: kameletResource,
      visibleFlowsContext: {
        visibleFlows: { ['user-source']: true },
      } as unknown as VisibleFlowsContextResult,
    });

    let result: RenderResult | undefined;

    await act(async () => {
      result = render(
        <ActionConfirmationModalContextProvider>
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas entities={kameletEntities} />
            </VisualizationProvider>
          </Provider>
        </ActionConfirmationModalContextProvider>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
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
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFlowsContextResult,
      });

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <CatalogModalContext.Provider
            value={{ getNewComponent: jest.fn(), setIsModalOpen: jest.fn(), checkCompatibility: jest.fn() }}
          >
            <Provider>
              <VisualizationProvider controller={ControllerService.createController()}>
                <Canvas entities={[entity]} />
              </VisualizationProvider>
            </Provider>
          </CatalogModalContext.Provider>,
        );
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(async () => expect(screen.getByText('Open Catalog')).toBeInTheDocument());
      expect(result?.asFragment()).toMatchSnapshot();
    });

    it('should NOT be present if `CatalogModalContext` is NOT provided', async () => {
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFlowsContextResult,
      });

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas entities={[entity]} />
            </VisualizationProvider>
          </Provider>,
        );
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(async () => expect(screen.queryByText('Open Catalog')).not.toBeInTheDocument());
      expect(result?.asFragment()).toMatchSnapshot();
    });
  });

  describe('Empty state', () => {
    it('should render empty state when there is no visual entity', async () => {
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: {} } as unknown as VisibleFlowsContextResult,
      });

      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas entities={[]} />
            </VisualizationProvider>
          </Provider>,
        );
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(async () => expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result?.asFragment()).toMatchSnapshot();
    });

    it('should render empty state when there is no visible flows', async () => {
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: { ['route-8888']: false } } as unknown as VisibleFlowsContextResult,
      });
      let result: RenderResult | undefined;

      await act(async () => {
        result = render(
          <Provider>
            <VisualizationProvider controller={ControllerService.createController()}>
              <Canvas entities={[entity]} />
            </VisualizationProvider>
          </Provider>,
        );
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(async () => expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result?.container).toMatchSnapshot();
    });
  });
});
