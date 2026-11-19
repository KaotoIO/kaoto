import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource, KameletResource } from '../models/camel';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import { EntitiesContext, EntitiesContextResult } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { createMockEntitiesContext } from '../stubs';
import { useCanvasEntities } from './useCanvasEntities';

describe('useCanvasEntities', () => {
  let entitiesContext: EntitiesContextResult;

  const visibleFlowsContext = { visibleFlows: {}, allFlowsVisible: true, visualFlowsApi: new VisualFlowsApi(vi.fn()) };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={entitiesContext}>
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>{children}</VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );

  it('offers the entities of the current resource', async () => {
    const routeResource = new CamelRouteResource();
    entitiesContext = await createMockEntitiesContext(routeResource);

    const { result } = renderHook(() => useCanvasEntities(), { wrapper });

    expect(result.current.commonEntities).toBe(routeResource.getCanvasEntityList().common);
    expect(result.current.commonEntities.length).toBeGreaterThan(0);
  });

  it('follows the resource when it is replaced, without remounting', async () => {
    const routeResource = new CamelRouteResource();
    entitiesContext = await createMockEntitiesContext(routeResource);
    const { result, rerender } = renderHook(() => useCanvasEntities(), { wrapper });
    expect(result.current.commonEntities.length).toBeGreaterThan(0);

    /* A Kamelet offers no entities to add */
    entitiesContext = await createMockEntitiesContext(new KameletResource() as unknown as CamelRouteResource);
    rerender();

    expect(result.current.commonEntities).toEqual([]);
    expect(result.current.groupedEntities).toEqual({});
  });

  it('keeps the same result while the resource stays the same', async () => {
    entitiesContext = await createMockEntitiesContext(new CamelRouteResource());
    const { result, rerender } = renderHook(() => useCanvasEntities(), { wrapper });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
