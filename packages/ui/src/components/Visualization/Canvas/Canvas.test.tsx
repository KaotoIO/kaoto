import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFLowsContextResult } from '../../../providers/visible-flows.provider';
import { TestProvidersWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { kameletJson } from '../../../stubs/kamelet-route';
import { Canvas } from './Canvas';
import { ActionConfirmationModalContextProvider } from '../../../providers';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);
  const entity2 = { ...entity, id: 'route-9999' } as CamelRouteVisualEntity;

  it('should render correctly', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult,
    });
    const result = render(
      <Provider>
        <Canvas entities={[entity]} />
      </Provider>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should render correctly with more routes ', async () => {
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: {
        visibleFlows: { ['route-8888']: true, ['route-9999']: false },
      } as unknown as VisibleFLowsContextResult,
    });
    const result = render(
      <Provider>
        <Canvas entities={[entity, entity2]} />
      </Provider>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should be able to delete the routes', async () => {
    const camelResource = new CamelRouteResource(camelRouteJson);
    const routeEntities = camelResource.getVisualEntities();
    const removeSpy = jest.spyOn(camelResource, 'removeEntity');

    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: { ['route-8888']: true },
      } as unknown as VisibleFLowsContextResult,
    });
    const wrapper = render(
      <ActionConfirmationModalContextProvider>
        <Provider>
          <Canvas entities={routeEntities} />
        </Provider>
      </ActionConfirmationModalContextProvider>,
    );

    // Right click anywhere on the container label
    const route = wrapper.getByText('route-8888');
    await act(async () => {
      fireEvent.contextMenu(route);
    });

    // Click the Delete ContextMenuItem
    const deleteRoute = screen.getByRole('menuitem', { name: 'Delete' });
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
    expect(removeSpy).toHaveBeenCalledWith('route-8888');
  });

  it('should be able to delete the kamelets', async () => {
    const kameletResource = new KameletResource(kameletJson);
    const kameletEntities = kameletResource.getVisualEntities();
    const removeSpy = jest.spyOn(kameletResource, 'removeEntity');

    const { Provider } = TestProvidersWrapper({
      camelResource: kameletResource,
      visibleFlowsContext: {
        visibleFlows: { ['user-source']: true },
      } as unknown as VisibleFLowsContextResult,
    });

    const wrapper = render(
      <ActionConfirmationModalContextProvider>
        <Provider>
          <Canvas entities={kameletEntities} />
        </Provider>
      </ActionConfirmationModalContextProvider>,
    );

    // Right click anywhere on the container label
    const kamelet = wrapper.getByText('user-source');
    // const route = document.querySelectorAll('.pf-topology__group');
    await act(async () => {
      fireEvent.contextMenu(kamelet);
    });

    // click the Delete ContextMenuItem
    const deleteKamelet = screen.getByRole('menuitem', { name: 'Delete' });
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

  it('should render the Catalog button if `CatalogModalContext` is provided', async () => {
    const { Provider } = TestProvidersWrapper({
      visibleFlowsContext: { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult,
    });
    const result = render(
      <CatalogModalContext.Provider value={{ getNewComponent: jest.fn(), setIsModalOpen: jest.fn() }}>
        <Provider>
          <Canvas entities={[entity]} />
        </Provider>
      </CatalogModalContext.Provider>,
    );

    await waitFor(async () =>
      expect(result.container.querySelector('#topology-control-bar-catalog-button')).toBeInTheDocument(),
    );
    expect(result.container).toMatchSnapshot();
  });

  describe('Empty state', () => {
    it('should render empty state when there is no visual entity', async () => {
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: {} } as unknown as VisibleFLowsContextResult,
      });
      const result = render(
        <Provider>
          <Canvas entities={[]} />
        </Provider>,
      );

      await waitFor(async () => expect(result.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result.container).toMatchSnapshot();
    });

    it('should render empty state when there is no visible flows', async () => {
      const { Provider } = TestProvidersWrapper({
        visibleFlowsContext: { visibleFlows: { ['route-8888']: false } } as unknown as VisibleFLowsContextResult,
      });
      const result = render(
        <Provider>
          <Canvas entities={[entity]} />
        </Provider>,
      );

      await waitFor(async () => expect(result.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result.container).toMatchSnapshot();
    });
  });
});
