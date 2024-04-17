import { render, waitFor, fireEvent, screen} from '@testing-library/react';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFLowsContextResult } from '../../../providers/visible-flows.provider';
import { CamelRouteResource, KameletResource } from '../../../models/camel';
import { camelRouteJson } from '../../../stubs/camel-route';
import { kameletJson } from '../../../stubs/kamelet-route';
import { TestProvidersWrapper } from '../../../stubs';
import { act } from 'react-dom/test-utils';
import { Canvas } from './Canvas';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson.route);
  const entity2 = { ...entity, id: 'route-9999' } as CamelRouteVisualEntity;

  it('should render correctly', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = render(
      <TestProvidersWrapper
        visibleFlows={{ visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult}
      >
        <Canvas entities={[entity]} />
      </TestProvidersWrapper>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should render correctly with more routes ', async () => {
    const result = render(
      <TestProvidersWrapper
        visibleFlows={
          { visibleFlows: { ['route-8888']: true, ['route-9999']: false } } as unknown as VisibleFLowsContextResult
        }
      >
        <Canvas entities={[entity, entity2]} />
      </TestProvidersWrapper>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should be able to delete the routes', async () => {
    const camelRouteResource = new CamelRouteResource(camelRouteJson);
    const routeEntity = camelRouteResource.getVisualEntities();
    const removeSpy = jest.spyOn(camelRouteResource, 'removeEntity');

    render(
      <TestProvidersWrapper
      visibleFlows={
        { visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult
      }
    >
      <Canvas entities={routeEntity} />
    </TestProvidersWrapper>,
    );

    // Right click anywhere on the container label
    const route = screen.getByText('route-8888');
    // const route = document.querySelectorAll('.pf-topology__group');
    await act(async() => {
      fireEvent.contextMenu(route);
    });

    // click the Delete ContextMenuItem
    const deleteRoute = screen.getByRole('menuitem', {name: 'Delete'});
    expect(deleteRoute).toBeInTheDocument();

    await act(() => {
      fireEvent.click(deleteRoute);
    });

    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('route-8888');
  });

  it('should be able to delete the kamelets', async () => {
    const kameletResource = new KameletResource(kameletJson);
    const kameletEntity = kameletResource.getVisualEntities();
    const removeSpy = jest.spyOn(kameletResource, 'removeEntity');

    render(
      <TestProvidersWrapper
      visibleFlows={
        { visibleFlows: { ['user-source']: true } } as unknown as VisibleFLowsContextResult
      }
    >
      <Canvas entities={kameletEntity} />
    </TestProvidersWrapper>,
    );

    // Right click anywhere on the container label
    const kamelet = screen.getByText('user-source');
    // const route = document.querySelectorAll('.pf-topology__group');
    await act(async() => {
      fireEvent.contextMenu(kamelet);
    });

    // click the Delete ContextMenuItem
    const deleteKamelet = screen.getByRole('menuitem', {name: 'Delete'});
    expect(deleteKamelet).toBeInTheDocument();

    await act(() => {
      fireEvent.click(deleteKamelet);
    });

    screen.debug();
    // Check if the remove function is called
    expect(removeSpy).toHaveBeenCalled();
  });

  it('should render the Catalog button if `CatalogModalContext` is provided', async () => {
    const result = render(
      <CatalogModalContext.Provider value={{ getNewComponent: jest.fn(), setIsModalOpen: jest.fn() }}>
        <TestProvidersWrapper
          visibleFlows={{ visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult}
        >
          <Canvas entities={[entity]} />
        </TestProvidersWrapper>
      </CatalogModalContext.Provider>,
    );

    await waitFor(async () =>
      expect(result.container.querySelector('#topology-control-bar-catalog-button')).toBeInTheDocument(),
    );
    expect(result.container).toMatchSnapshot();
  });

  describe('Empty state', () => {
    it('should render empty state when there is no visual entity', async () => {
      const result = render(
        <TestProvidersWrapper visibleFlows={{ visibleFlows: {} } as unknown as VisibleFLowsContextResult}>
          <Canvas entities={[]} />
        </TestProvidersWrapper>,
      );

      await waitFor(async () => expect(result.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result.container).toMatchSnapshot();
    });

    it('should render empty state when there is no visible flows', async () => {
      const result = render(
        <TestProvidersWrapper
          visibleFlows={{ visibleFlows: { ['route-8888']: false } } as unknown as VisibleFLowsContextResult}
        >
          <Canvas entities={[entity]} />
        </TestProvidersWrapper>,
      );

      await waitFor(async () => expect(result.getByTestId('visualization-empty-state')).toBeInTheDocument());
      expect(result.container).toMatchSnapshot();
    });
  });
});
