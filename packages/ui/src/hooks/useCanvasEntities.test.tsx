import { renderHook } from '@testing-library/react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntityType } from '../models/entities';
import { TestProvidersWrapper } from '../stubs';
import { useCanvasEntities } from './useCanvasEntities';

describe('useCanvasEntities', () => {
  it('picks up an entity list that is available only after the first render', async () => {
    const camelResource = new CamelRouteResource();
    const { Provider } = await TestProvidersWrapper({ camelResource });
    const listSpy = vi.spyOn(camelResource, 'getCanvasEntityList').mockReturnValue({ common: [], groups: {} });

    const { result, rerender } = renderHook(() => useCanvasEntities(), { wrapper: Provider });
    expect(result.current.commonEntities).toEqual([]);

    /* The resource finished initializing after the canvas, and its toolbar, were mounted */
    listSpy.mockReturnValue({
      common: [{ name: EntityType.Route, title: 'Route', description: 'A route' }],
      groups: {},
    });
    rerender();

    expect(result.current.commonEntities).toEqual([{ name: EntityType.Route, title: 'Route', description: 'A route' }]);
  });
});
