import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../models/catalog-kind';

/**
 * Configuration for injecting errors into catalog lookups
 */
export interface CatalogErrorConfig {
  kind: CatalogKind;
  name: string;
  error: Error;
}

/**
 * Sets up a mock for DynamicCatalogRegistry that returns data directly from the catalogs.
 * This avoids calling CamelCatalogService and works with the async DynamicCatalogRegistry API.
 *
 * Accepts the raw catalog structure from getFirstCatalogMap() and converts it internally.
 *
 * @param catalogsMap - The flat catalog structure returned by getFirstCatalogMap()
 * @param errorConfigs - Optional array of error configurations to inject failures for specific catalog entries
 */
export function setupDynamicCatalogRegistryMock(
  catalogsMap: {
    componentCatalogMap?: Record<string, unknown>;
    modelCatalogMap?: Record<string, unknown>;
    patternCatalogMap?: Record<string, unknown>;
    entitiesCatalog?: Record<string, unknown>;
    languageCatalog?: Record<string, unknown>;
    dataformatCatalog?: Record<string, unknown>;
    loadbalancerCatalog?: Record<string, unknown>;
    kameletsCatalogMap?: Record<string, unknown>;
    functionsCatalogMap?: Record<string, Record<string, unknown>>;
  },
  errorConfigs?: CatalogErrorConfig[],
): void {
  // Build error map for quick lookup
  const errorMap = new Map<string, Error>();
  if (errorConfigs) {
    errorConfigs.forEach((config) => {
      const key = `${config.kind}:${config.name}`;
      errorMap.set(key, config.error);
    });
  }

  const mockRegistry = {
    getEntity: jest.fn((kind: CatalogKind, name: string) => {
      // Check if this lookup should throw an error
      const errorKey = `${kind}:${name}`;
      const error = errorMap.get(errorKey);
      if (error) {
        return Promise.reject(error);
      }

      // Map CatalogKind to the corresponding property in catalogsMap
      let catalog: Record<string, unknown> | undefined;
      switch (kind) {
        case CatalogKind.Component:
          catalog = catalogsMap.componentCatalogMap;
          break;
        case CatalogKind.Processor:
          catalog = catalogsMap.modelCatalogMap;
          break;
        case CatalogKind.Pattern:
          catalog = catalogsMap.patternCatalogMap;
          break;
        case CatalogKind.Entity:
          catalog = catalogsMap.entitiesCatalog;
          break;
        case CatalogKind.Language:
          catalog = catalogsMap.languageCatalog;
          break;
        case CatalogKind.Dataformat:
          catalog = catalogsMap.dataformatCatalog;
          break;
        case CatalogKind.Loadbalancer:
          catalog = catalogsMap.loadbalancerCatalog;
          break;
        case CatalogKind.Kamelet:
          catalog = catalogsMap.kameletsCatalogMap;
          break;
        case CatalogKind.Function:
          catalog = catalogsMap.functionsCatalogMap;
          break;
      }

      return Promise.resolve(catalog?.[name]);
    }),
  };

  (DynamicCatalogRegistry.get as jest.Mock).mockReturnValue(mockRegistry);
}
