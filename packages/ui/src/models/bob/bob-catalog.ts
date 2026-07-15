import { CatalogKind } from '../catalog-kind';
import { KaotoSchemaDefinition } from '../kaoto-schema';

/**
 * Interface representing a Bob catalog entry (tool or instruction component).
 */
export interface IBobComponentDefinition {
  kind: CatalogKind.BobTool | CatalogKind.BobComponent;

  version?: string;

  name: string;

  group?: string;

  title?: string;

  description?: string;

  propertiesSchema?: KaotoSchemaDefinition['schema'];
}
