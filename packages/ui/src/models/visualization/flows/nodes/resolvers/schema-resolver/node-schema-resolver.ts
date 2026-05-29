import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { ICamelComponentDefinition } from '../../../../../camel/camel-components-catalog';
import { IKameletDefinition } from '../../../../../camel/kamelets-catalog';
import { CatalogKind } from '../../../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../../../kaoto-schema';
import { CamelComponentSchemaService } from '../../../support/camel-component-schema.service';
import { ICamelElementLookupResult } from '../../../support/camel-component-types';

type ComponentsCatalogTypes = ICamelComponentDefinition | IKameletDefinition;

export class NodeSchemaResolver {
  /**
   * Gets the schema for an Entity catalog node (routeConfiguration, intercept, etc.)
   * by fetching directly from the Entity catalog.
   *
   * @param entityName - The entity name to look up
   * @returns Promise resolving to the entity's properties schema
   */
  static async getEntitySchema(entityName: string): Promise<KaotoSchemaDefinition['schema']> {
    try {
      const entityDefinition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, entityName);
      return entityDefinition?.propertiesSchema ?? {};
    } catch (error) {
      console.warn(`Failed to fetch Entity schema for ${entityName}:`, error);
      return {};
    }
  }

  /**
   * Resolves the full schema for a processor, optionally merged with a component schema.
   *
   * @param path - The path to the processor in the entity definition
   * @param definition - The processor definition object
   * @returns Promise resolving to the composite schema
   */
  static async getProcessorSchema(
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition: any,
  ): Promise<KaotoSchemaDefinition['schema']> {
    // Handle special case: Kamelet root node (inferred from path='template')
    if (path === 'template') {
      const kameletConfig = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'KameletConfiguration');
      return kameletConfig?.propertiesSchema ?? {};
    }

    // Extract processor and component names from path and definition
    const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);

    // Get base processor schema
    let schema = await this.getProcessorBaseSchema(camelElementLookup);

    // If component is involved, fetch and merge component schema
    if (camelElementLookup.componentName !== undefined) {
      const componentLookup = await CamelComponentSchemaService.resolveCatalogLookup(camelElementLookup.componentName);

      if (componentLookup?.definition) {
        schema = this.mergeComponentSchema(
          schema,
          componentLookup.definition,
          camelElementLookup.processorName,
          camelElementLookup.componentName,
        );
      }
    }

    return schema;
  }

  /**
   * Fetches the base processor schema from the catalog.
   * This is the async equivalent of the core schema fetching logic from CamelComponentSchemaService.getSchema()
   *
   * @param camelElementLookup - Contains processorName
   * @returns Promise resolving to the processor's base schema
   */
  private static async getProcessorBaseSchema(
    camelElementLookup: ICamelElementLookupResult,
  ): Promise<KaotoSchemaDefinition['schema']> {
    // 1. Determine catalog kind based on processor name
    const catalogKind = this.getCatalogKind(camelElementLookup.processorName);

    // 2. Fetch processor definition from catalog
    const processorDefinition = await DynamicCatalogRegistry.get().getEntity(
      catalogKind,
      camelElementLookup.processorName,
    );

    // 3. Return cloned processor schema
    if (processorDefinition?.propertiesSchema === undefined) {
      return {};
    }

    return cloneDeep(processorDefinition.propertiesSchema);
  }

  /**
   * Determines the catalog kind (Entity or Pattern) based on processor name.
   * Entities are special processors like route, from, interceptors, etc.
   */
  private static getCatalogKind(processorName: keyof ProcessorDefinition): CatalogKind {
    switch (processorName) {
      case 'route' as keyof ProcessorDefinition:
      case 'intercept' as keyof ProcessorDefinition:
      case 'interceptFrom' as keyof ProcessorDefinition:
      case 'interceptSendToEndpoint' as keyof ProcessorDefinition:
      case 'onException' as keyof ProcessorDefinition:
      case 'onCompletion' as keyof ProcessorDefinition:
      case 'from' as keyof ProcessorDefinition:
        return CatalogKind.Entity;
      default:
        return CatalogKind.Pattern;
    }
  }

  /**
   * Merges component schema into processor schema.
   * Filters consumer/producer properties based on processor type (from vs to/toD/poll).
   */
  private static mergeComponentSchema(
    processorSchema: KaotoSchemaDefinition['schema'],
    componentDefinition: ComponentsCatalogTypes,
    processorName: keyof ProcessorDefinition,
    componentName: string,
  ): KaotoSchemaDefinition['schema'] {
    const componentSchema: KaotoSchemaDefinition['schema'] = componentDefinition?.propertiesSchema ?? {};

    // Filter out producer/consumer properties depending upon the endpoint usage
    const actualComponentProperties = Object.fromEntries(
      Object.entries(componentSchema.properties ?? {}).filter((property) => {
        if (processorName === ('from' as keyof ProcessorDefinition)) {
          // For 'from' processors, exclude producer-only properties
          return !property[1].$comment?.includes('producer');
        } else {
          // For 'to', 'toD', 'poll' processors, exclude consumer-only properties
          return !property[1].$comment?.includes('consumer');
        }
      }),
    );

    // Merge component properties into processor schema under 'parameters' property
    if (componentDefinition !== undefined && componentSchema !== undefined) {
      processorSchema.properties ??= {};
      if (!processorSchema.properties.parameters) {
        processorSchema.properties.parameters = { type: 'object', properties: {} };
      }
      processorSchema.properties.parameters.properties = actualComponentProperties;

      // Filter required array to only include properties that survived the filter
      const actualPropertyKeys = Object.keys(actualComponentProperties);
      const filteredRequired = Array.isArray(componentSchema.required)
        ? componentSchema.required.filter((key: string) => actualPropertyKeys.includes(key))
        : componentSchema.required;
      processorSchema.properties.parameters.required = filteredRequired;

      processorSchema.properties.parameters['x-component-name'] = componentName;
    }

    return processorSchema;
  }
}
