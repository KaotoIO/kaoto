import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../models/catalog-kind';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { fetchStarterTemplates } from './fetch-starter-templates';

const MOCK_INDEX = {
  runtime: 'StarterTemplates',
  catalogs: {
    'camel-route-yaml': { name: 'camel-route-yaml', file: 'route.yaml', description: '', version: '1' },
    'pipe-yaml': { name: 'pipe-yaml', file: 'pipe.yaml', description: '', version: '1' },
  },
  schemas: {},
};

const MOCK_CATALOG_LIBRARY = {
  starterTemplates: 'starter-templates/index.json',
} as unknown as CatalogLibrary;

const BASE_PATH = '/catalog';

describe('fetchStarterTemplates', () => {
  beforeEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers StarterTemplate catalog in DynamicCatalogRegistry with all keys', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ json: async () => MOCK_INDEX }) // index fetch
      .mockResolvedValueOnce({ text: async () => 'route yaml content' }) // route.yaml
      .mockResolvedValueOnce({ text: async () => 'pipe yaml content' }); // pipe.yaml

    await fetchStarterTemplates(BASE_PATH, MOCK_CATALOG_LIBRARY);

    const catalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.StarterTemplate);
    expect(catalog).toBeDefined();

    const routeTemplate = await catalog!.get('camel-route-yaml');
    expect(routeTemplate).toBe('route yaml content');

    const pipeTemplate = await catalog!.get('pipe-yaml');
    expect(pipeTemplate).toBe('pipe yaml content');
  });

  it('does nothing when starterTemplates path is missing from catalogLibrary', async () => {
    const libWithoutTemplates = {} as unknown as CatalogLibrary;
    await fetchStarterTemplates(BASE_PATH, libWithoutTemplates);
    const catalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.StarterTemplate);
    expect(catalog).toBeUndefined();
  });
});
