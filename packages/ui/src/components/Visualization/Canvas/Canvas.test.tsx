import { render, waitFor } from '@testing-library/react';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { camelRouteJson } from '../../../stubs/camel-route';
import { Canvas } from './Canvas';
import { VisibleFlowsContext, VisibleFLowsContextResult } from '../../../providers/visible-flows.provider';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson.route);
  const entity2 = { ...entity, id: 'route-9999' } as CamelRouteVisualEntity;

  it('should render correctly', async () => {
    const result = render(
      <VisibleFlowsContext.Provider
        value={{ visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult}
      >
        <Canvas entities={[entity]} />
      </VisibleFlowsContext.Provider>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should render correctly with more routes ', async () => {
    const result = render(
      <VisibleFlowsContext.Provider
        value={
          { visibleFlows: { ['route-8888']: true, ['route-9999']: false } } as unknown as VisibleFLowsContextResult
        }
      >
        <Canvas entities={[entity, entity2]} />
      </VisibleFlowsContext.Provider>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());
    expect(result.container).toMatchSnapshot();
  });

  it('should render the Catalog button if `CatalogModalContext` is provided', async () => {
    const result = render(
      <CatalogModalContext.Provider value={{ getNewComponent: jest.fn(), setIsModalOpen: jest.fn() }}>
        <VisibleFlowsContext.Provider
          value={{ visibleFlows: { ['route-8888']: true } } as unknown as VisibleFLowsContextResult}
        >
          <Canvas entities={[entity]} />
        </VisibleFlowsContext.Provider>
      </CatalogModalContext.Provider>,
    );

    await waitFor(async () =>
      expect(result.container.querySelector('#topology-control-bar-catalog-button')).toBeInTheDocument(),
    );
    expect(result.container).toMatchSnapshot();
  });
});
