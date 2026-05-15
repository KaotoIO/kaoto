import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { CAMEL_RUNTIMES, TEST_RUNTIMES } from '../models/catalog-runtime-types';
import { versionCompare } from './version-compare';

/**
 * Check if a runtime is a Camel runtime (Main, Quarkus, Spring Boot)
 */
export const isCamelRuntime = (runtime: string): boolean => {
  return (CAMEL_RUNTIMES as readonly string[]).includes(runtime);
};

/**
 * Check if a runtime is a test runtime (Citrus)
 */
export const isTestRuntime = (runtime: string): boolean => {
  return (TEST_RUNTIMES as readonly string[]).includes(runtime);
};

/**
 * Finds the appropriate catalog for a given source schema type.
 *
 * For test source types (SourceSchemaType.Test), returns the first available test runtime catalog sorted by version.
 * For other source types, returns the first available RedHat Main catalog sorted by version.
 *
 * @param sourceType - The source schema type to find a catalog for
 * @param catalogLibrary - The catalog library containing available catalogs
 * @returns The matching catalog entry or undefined if not found or library is unavailable
 */
export const findCatalog = (sourceType: SourceSchemaType, catalogLibrary?: CatalogLibrary) => {
  if (!catalogLibrary) {
    return undefined;
  }

  if (sourceType === SourceSchemaType.Test) {
    const testCatalogs = catalogLibrary.definitions
      .filter((c: CatalogLibraryEntry) => isTestRuntime(c.runtime))
      .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) => versionCompare(c1.version, c2.version));
    return testCatalogs.length > 0 ? testCatalogs[0] : undefined;
  } else {
    const redhatMainCatalogs = catalogLibrary.definitions
      .filter((c: CatalogLibraryEntry) => c.runtime === 'Main' && c.name.includes('redhat'))
      .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) =>
        versionCompare(c1.version.split('.redhat')[0], c2.version.split('.redhat')[0]),
      );

    return redhatMainCatalogs.length > 0 ? redhatMainCatalogs[0] : undefined;
  }
};

/**
 * Determines if a catalog change is required based on the source type and current catalog.
 *
 * A catalog change is required when:
 * - The current catalog is a test runtime but the source type is not Test
 * - The current catalog is not a test runtime but the source type is Test
 *
 * @param sourceType - The source schema type being used
 * @param catalog - The currently active catalog
 * @returns True if a catalog change is required, false otherwise
 */
export const requiresCatalogChange = (sourceType: SourceSchemaType, catalog?: CatalogLibraryEntry) => {
  if (!catalog?.runtime) return false;

  const isTestCatalog = isTestRuntime(catalog.runtime);
  const isTestSource = sourceType === SourceSchemaType.Test;

  return isTestCatalog !== isTestSource;
};
