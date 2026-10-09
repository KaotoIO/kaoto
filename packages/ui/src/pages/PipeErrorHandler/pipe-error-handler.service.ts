import { CatalogKind } from '@kaoto/editor-api';

import { DynamicCatalogRegistry } from '../../dynamic-catalog/dynamic-catalog-registry';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';

export class PipeErrorHandlerService {
  static async getErrorHandlerSchema(): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    const definition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'PipeErrorHandler');
    const errorHandlerSchema = definition?.propertiesSchema ? { ...definition.propertiesSchema } : undefined;

    if (Array.isArray(errorHandlerSchema?.oneOf) && !Array.isArray(errorHandlerSchema.anyOf)) {
      errorHandlerSchema.anyOf = [{ oneOf: errorHandlerSchema.oneOf }];
      delete errorHandlerSchema.oneOf;
    }

    return errorHandlerSchema;
  }
}
