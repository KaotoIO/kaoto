import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { vi } from 'vitest';

import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { getFirstCatalogMap } from './test-load-catalog';

/**
 * Makes `fetch` serve the bundled catalog, so a component below the RuntimeProvider renders instead of the catalog
 * error: the catalog library index on the first request, the definition of its first catalog on all later ones.
 */
export const serveBundledCatalog = async (): Promise<void> => {
  const { catalogDefinition } = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
  const respond = (body: unknown, file: unknown) =>
    Promise.resolve({ json: () => body, url: `http://localhost/${String(file)}` } as unknown as Response);

  vi.spyOn(globalThis, 'fetch')
    .mockImplementationOnce((file) => respond(catalogLibrary, file))
    .mockImplementation((file) => respond(catalogDefinition, file));
  vi.spyOn(CatalogSchemaLoader, 'fetchFile').mockImplementation((uri: string) =>
    Promise.resolve({ uri, body: { [uri]: 'dummy-data' } }),
  );
};
