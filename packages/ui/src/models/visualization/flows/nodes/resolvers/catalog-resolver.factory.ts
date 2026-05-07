import { DynamicCatalogRegistry } from '../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../catalog-kind';

/**
 * Generic catalog property resolver factory.
 * Eliminates duplication between title and tooltip resolvers.
 */
export class CatalogResolverFactory {
  /**
   * Resolves a property from the catalog based on catalog kind and name.
   *
   * @param catalogKind - The type of catalog item
   * @param name - The name/identifier of the catalog item
   * @param propertyExtractor - Function to extract the desired property from the catalog definition
   * @param fallback - Optional fallback value if resolution fails
   * @returns Promise resolving to the property value or fallback
   */
  static async resolveProperty<T>(
    catalogKind: CatalogKind,
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertyExtractor: (definition: any) => T | undefined,
    fallback?: T,
  ): Promise<T | undefined> {
    try {
      const definition = await DynamicCatalogRegistry.get().getEntity(catalogKind, name);
      if (definition) {
        const value = propertyExtractor(definition);
        if (value !== undefined && value !== null) {
          return value;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch property from ${catalogKind} catalog for "${name}"`, error);
    }
    return fallback;
  }

  /**
   * Resolves a property by trying multiple catalog kinds in order.
   * Useful for processors that might be in Processor or Pattern catalogs.
   *
   * @param catalogKinds - Array of catalog kinds to try in order
   * @param name - The name/identifier of the catalog item
   * @param propertyExtractor - Function to extract the desired property from the catalog definition
   * @param fallback - Optional fallback value if all resolutions fail
   * @returns Promise resolving to the first successful property value or fallback
   */
  static async resolvePropertyWithFallbacks<T>(
    catalogKinds: CatalogKind[],
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertyExtractor: (definition: any) => T | undefined,
    fallback?: T,
  ): Promise<T | undefined> {
    for (const kind of catalogKinds) {
      const value = await this.resolveProperty(kind, name, propertyExtractor);
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return fallback;
  }
}
