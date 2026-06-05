import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render } from '@testing-library/react';

import { camelRouteYaml } from '../../stubs/camel-route';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { RouteVisualization } from './RouteVisualization';

describe('RouteVisualization', () => {
  let fetchResolve: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    const fetchMock = jest.spyOn(window, 'fetch');

    // The first fetch (RuntimeProvider) loads the catalog library index, while
    // the subsequent fetches (Schemas/Catalog loaders) load the catalog
    // definition.
    fetchMock.mockImplementationOnce((file) => {
      return new Promise((resolve) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogLibrary,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
      });
    });
    fetchMock.mockImplementation((file) => {
      return new Promise((resolve) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogDefinition,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
      });
    });

    jest.spyOn(CatalogSchemaLoader, 'fetchFile').mockImplementation((uri: string) => {
      return Promise.resolve({ uri, body: { [uri]: 'dummy-data' } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the canvas from the code prop without throwing', async () => {
    render(
      <RouteVisualization
        catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
        code={camelRouteYaml}
        codeChange={jest.fn()}
      />,
    );

    // The SchemasLoaderProvider and CatalogLoaderProvider each perform a
    // sequential fetch of the index file, so resolve the pending fetch until
    // the canvas surface is mounted.
    for (let i = 0; i < 5 && !document.querySelector('.canvas-surface'); i++) {
      await act(async () => {
        fetchResolve();
      });
    }

    expect(document.querySelector('.canvas-surface')).toBeInTheDocument();
  });
});
