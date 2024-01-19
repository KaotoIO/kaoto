import { render, waitFor } from '@testing-library/react';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFLowsContextResult } from '../../../providers/visible-flows.provider';
import { TestProvidersWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { Canvas } from './Canvas';

describe('Canvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson.route);
  const entity2 = { ...entity, id: 'route-9999' } as CamelRouteVisualEntity;

  it('should render correctly', async () => {
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
