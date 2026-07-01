import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntitiesContextResult } from '../providers/entities.provider';

export const createMockEntitiesContext = async (camelResource: CamelRouteResource): Promise<EntitiesContextResult> => {
  await camelResource.initialize();
  return {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: vi.fn(),
    updateEntitiesFromCamelResource: vi.fn(),
  };
};
