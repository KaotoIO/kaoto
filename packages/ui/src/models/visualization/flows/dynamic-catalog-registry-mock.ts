import { KaotoFunction } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import {
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelLoadBalancerDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../../models';
import { CatalogKind } from '../../catalog-kind';

/**
 * Type for the catalog maps returned by getFirstCatalogMap()
 */
export interface CatalogsMap {
  componentCatalogMap: Record<string, ICamelComponentDefinition>;
  modelCatalogMap: Record<string, ICamelProcessorDefinition>;
  patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  kameletsCatalogMap: Record<string, IKameletDefinition>;
  languageCatalog: Record<string, ICamelLanguageDefinition>;
  dataformatCatalog: Record<string, ICamelDataformatDefinition>;
  loadbalancerCatalog: Record<string, ICamelLoadBalancerDefinition>;
  entitiesCatalog: Record<string, ICamelProcessorDefinition>;
  functionsCatalogMap: Record<string, Record<string, KaotoFunction>>;
}

/**
 * Sets up a mock for DynamicCatalogRegistry that returns data directly from the catalogsMap.
 * This avoids calling CamelCatalogService and works with the async DynamicCatalogRegistry API.
 *
 * @param catalogsMap - The catalog maps returned by getFirstCatalogMap()
 */
export function setupDynamicCatalogRegistryMock(catalogsMap: CatalogsMap): void {
  const catalogMapping: Partial<Record<CatalogKind, Record<string, unknown>>> = {
    [CatalogKind.Component]: catalogsMap.componentCatalogMap,
    [CatalogKind.Processor]: catalogsMap.modelCatalogMap,
    [CatalogKind.Pattern]: catalogsMap.patternCatalogMap,
    [CatalogKind.Entity]: catalogsMap.entitiesCatalog,
    [CatalogKind.Language]: catalogsMap.languageCatalog,
    [CatalogKind.Dataformat]: catalogsMap.dataformatCatalog,
    [CatalogKind.Loadbalancer]: catalogsMap.loadbalancerCatalog,
    [CatalogKind.Kamelet]: catalogsMap.kameletsCatalogMap,
    [CatalogKind.Function]: catalogsMap.functionsCatalogMap,
  };

  const mockRegistry = {
    getEntity: jest.fn((kind: CatalogKind, name: string) => {
      const catalog = catalogMapping[kind];
      return Promise.resolve(catalog?.[name]);
    }),
  };

  (DynamicCatalogRegistry.get as jest.Mock).mockReturnValue(mockRegistry);
}
