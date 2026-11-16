import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import { EntitiesContext, EntitiesContextResult } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { useCanvasEntities } from './useCanvasEntities';

describe('useCanvasEntities', () => {
  const contextFor = (camelResource: CamelRouteResource): EntitiesContextResult => ({
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: vi.fn(),
    updateEntitiesFromCamelResource: vi.fn(),
  });

  it('lists the entities once the resource is initialized after the first render', async () => {
    // The canvas, and its toolbar, mount before the resource is initialized and stay mounted
    const camelResource = new CamelRouteResource();
    let context = contextFor(camelResource);
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <VisibleFlowsContext.Provider
        value={{ visibleFlows: {}, allFlowsVisible: true, visualFlowsApi: new VisualFlowsApi(vi.fn()) }}
      >
        <EntitiesContext.Provider value={context}>{children}</EntitiesContext.Provider>
      </VisibleFlowsContext.Provider>
    );
    const { result, rerender } = renderHook(() => useCanvasEntities(), { wrapper });
    const before = result.current.commonEntities;

    await camelResource.initialize();
    context = contextFor(camelResource);
    rerender();

    expect(camelResource.getCanvasEntityList().common.length).toBeGreaterThan(0);
    expect(result.current.commonEntities).toEqual(camelResource.getCanvasEntityList().common);
    expect(result.current.commonEntities).not.toEqual(before);
  });
});
