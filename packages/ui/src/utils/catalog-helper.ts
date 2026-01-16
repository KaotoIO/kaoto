import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { versionCompare } from './version-compare';

/**
 * Finds the appropriate catalog for a given source schema type.
 *
 * For Citrus tests (SourceSchemaType.Test), returns the first available Citrus catalog sorted by version.
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
 * - The current catalog is Citrus but the source type is not Test
 * - The current catalog is not Citrus but the source type is Test
 *
 * @param sourceType - The source schema type being used
 * @param catalog - The currently active catalog
 * @returns True if a catalog change is required, false otherwise
 */
export const requiresCatalogChange = (sourceType: SourceSchemaType, catalog?: CatalogLibraryEntry) => {
  return catalog?.runtime === 'Citrus' ? sourceType !== SourceSchemaType.Test : sourceType === SourceSchemaType.Test;
};
