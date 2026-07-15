import { JSONSchema4 } from 'json-schema';

import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../../../bob/bob-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { CamelCatalogService } from '../camel-catalog.service';

/** Provides JSON schemas for CustomMode canvas nodes. */
export class CustomModeSchemaService {
  /** Schema for the mode node form (all fields except customInstructions). */
  static getRootSchema(): JSONSchema4 {
    return (
      CamelCatalogService.getComponent(CatalogKind.Entity, BOB_CUSTOM_MODE_ROOT_ENTITY_NAME)?.propertiesSchema ??
      ({} as KaotoSchemaDefinition['schema'])
    );
  }

  /** Schema for a customInstructions child node, resolved from Bob tool or component catalogs. */
  static getNodeSchema(nodeType: string): JSONSchema4 | undefined {
    const toolDef = CamelCatalogService.getComponent(CatalogKind.BobTool, nodeType);
    const componentDef = CamelCatalogService.getComponent(CatalogKind.BobComponent, nodeType);
    const definition = toolDef ?? componentDef;

    return definition?.propertiesSchema as JSONSchema4 | undefined;
  }
}
