import { JSONSchema4 } from 'json-schema';

import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../../../bob/bob-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { CamelCatalogService } from '../camel-catalog.service';

/** The fallback component name used when no specific node type is registered in the catalog. */
const BOB_FALLBACK_NODE_TYPE = 'text-node';

/** Provides JSON schemas for CustomMode canvas nodes. */
export class CustomModeSchemaService {
  /** Schema for the mode node form (all fields except customInstructions). */
  static getRootSchema(): JSONSchema4 {
    return (
      CamelCatalogService.getComponent(CatalogKind.Entity, BOB_CUSTOM_MODE_ROOT_ENTITY_NAME)?.propertiesSchema ??
      ({} as KaotoSchemaDefinition['schema'])
    );
  }

  /**
   * Schema for a customInstructions child node, resolved from Bob tool or component catalogs.
   *
   * Lookup order:
   *   1. BobTool[nodeType]          — named tool step (e.g. read_file)
   *   2. BobComponent[nodeType]     — named component step
   *   3. BobComponent[text-node]    — generic fallback for parser-emitted 'step' nodes
   */
  static getNodeSchema(nodeType: string): JSONSchema4 | undefined {
    const toolDef = CamelCatalogService.getComponent(CatalogKind.BobTool, nodeType);
    const componentDef = CamelCatalogService.getComponent(CatalogKind.BobComponent, nodeType);
    const fallbackDef = CamelCatalogService.getComponent(CatalogKind.BobComponent, BOB_FALLBACK_NODE_TYPE);
    // Chain on propertiesSchema so that a catalog entry without a schema falls through to the
    // next candidate, rather than stopping at a truthy-but-schema-less entry.
    return (toolDef?.propertiesSchema ?? componentDef?.propertiesSchema ?? fallbackDef?.propertiesSchema) as
      | JSONSchema4
      | undefined;
  }
}
