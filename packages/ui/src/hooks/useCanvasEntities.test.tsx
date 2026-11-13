import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { useCanvasEntities } from './useCanvasEntities';

describe('useCanvasEntities', () => {
  it('provides the entity list once the resource has been initialized after mount', async () => {
    const camelResource = new CamelRouteResource();
    const visibleFlowsValue = { visualFlowsApi: { toggleFlowVisible: vi.fn() } } as never;
    const updateEntitiesFromCamelResource = vi.fn();
    // Stands in for the EntitiesProvider value
    let value = { entities: camelResource.getEntities(), camelResource, updateEntitiesFromCamelResource } as never;

    const Wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={value}>
        <VisibleFlowsContext.Provider value={visibleFlowsValue}>{children}</VisibleFlowsContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result, rerender } = renderHook(() => useCanvasEntities(), { wrapper: Wrapper });
    expect(result.current.commonEntities).toEqual([]);

    await camelResource.initialize();
    // Like EntitiesProvider does after initialize(): new entities state => new context value
    value = { entities: [...camelResource.getEntities()], camelResource, updateEntitiesFromCamelResource } as never;
    rerender();

    expect(result.current.commonEntities).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'route' })]));
  });
});
