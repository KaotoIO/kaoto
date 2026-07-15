import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { versionCompare } from './version-compare';

const INTEGRATION_RUNTIMES = new Set(['Main', 'Quarkus', 'Spring Boot']);

/**
 * Returns the catalog library `runtime` value required for a given source schema type.
 * Integration types map to Camel family runtimes (Main/Quarkus/Spring Boot).
 */
export const getCatalogRuntimeForSourceType = (sourceType: SourceSchemaType): string | 'integration' => {
  if (sourceType === SourceSchemaType.Test) {
    return 'Citrus';
  }
  if (sourceType === SourceSchemaType.CustomMode) {
    return 'Bob';
  }
  return 'integration';
};

/**
 * Finds the appropriate catalog for a given source schema type.
 *
 * For Citrus tests (SourceSchemaType.Test), returns the first available Citrus catalog sorted by version.
 * For Custom Mode (SourceSchemaType.CustomMode), returns the first available Bob catalog sorted by version.
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
    const citrusCatalogs = catalogLibrary.definitions
      .filter((c: CatalogLibraryEntry) => c.runtime === 'Citrus')
      .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) => versionCompare(c1.version, c2.version));
    return citrusCatalogs.length > 0 ? citrusCatalogs[0] : undefined;
  }

  if (sourceType === SourceSchemaType.CustomMode) {
    const bobCatalogs = catalogLibrary.definitions
      .filter((c: CatalogLibraryEntry) => c.runtime === 'Bob')
      .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) => versionCompare(c1.version, c2.version));
    return bobCatalogs.length > 0 ? bobCatalogs[0] : undefined;
  }

  const redhatMainCatalogs = catalogLibrary.definitions
    .filter((c: CatalogLibraryEntry) => c.runtime === 'Main' && c.name.includes('redhat'))
    .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) =>
      versionCompare(c1.version.split('.redhat')[0], c2.version.split('.redhat')[0]),
    );

  if (redhatMainCatalogs.length > 0) {
    return redhatMainCatalogs[0];
  }

  const mainCatalogs = catalogLibrary.definitions
    .filter((c: CatalogLibraryEntry) => c.runtime === 'Main')
    .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) => versionCompare(c1.version, c2.version));

  return mainCatalogs.length > 0 ? mainCatalogs[0] : undefined;
};

/**
 * Determines if a catalog change is required based on the source type and current catalog.
 */
export const requiresCatalogChange = (sourceType: SourceSchemaType, catalog?: CatalogLibraryEntry) => {
  if (!catalog) {
    return false;
  }

  const targetRuntime = getCatalogRuntimeForSourceType(sourceType);

  if (targetRuntime === 'integration') {
    return !INTEGRATION_RUNTIMES.has(catalog.runtime);
  }

  return catalog.runtime !== targetRuntime;
};
