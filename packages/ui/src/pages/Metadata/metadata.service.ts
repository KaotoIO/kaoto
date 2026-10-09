import { CatalogKind } from '@kaoto/editor-api';

import { DynamicCatalogRegistry } from '../../dynamic-catalog/dynamic-catalog-registry';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';

export class MetadataService {
  static async getMetadataSchema(): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    const definition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'ObjectMeta');
    return definition?.propertiesSchema;
  }
}
