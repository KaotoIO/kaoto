import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { versionCompare } from './version-compare';

/**
 * Returns the best catalog matching the given compatible runtimes.
 *
 * Preference order: redhat builds win across all compatible runtimes (if any
 * redhat candidate exists in the compat-filtered pool, non-redhat candidates
 * are excluded regardless of runtime), then highest version among the pool.
 */
export const findCatalog = (
  compatibleRuntimes: readonly string[],
  catalogLibrary?: CatalogLibrary,
): CatalogLibraryEntry | undefined => {
  if (!catalogLibrary) return undefined;

  const candidates = catalogLibrary.definitions.filter((c: CatalogLibraryEntry) =>
    compatibleRuntimes.includes(c.runtime),
  );

  const preferred = candidates.filter((c) => c.name.includes('redhat'));
  const pool = preferred.length > 0 ? preferred : candidates;

  if (pool.length === 0) return undefined;

  return pool
    .slice()
    .sort((a: CatalogLibraryEntry, b: CatalogLibraryEntry) =>
      versionCompare(a.version.split('.redhat')[0], b.version.split('.redhat')[0]),
    )[0];
};

/**
 * Returns true if the given catalog's runtime is in the resource's
 * compatible runtimes list.
 */
export const isCatalogCompatible = (
  catalog: CatalogLibraryEntry | undefined,
  compatibleRuntimes: readonly string[],
): boolean => catalog !== undefined && compatibleRuntimes.includes(catalog.runtime);
