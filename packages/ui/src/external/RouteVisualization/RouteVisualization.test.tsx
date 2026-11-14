import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { useSuggestionRegistry } from '@kaoto/forms';
import { act, render, screen } from '@testing-library/react';

import * as VisualizationModule from '../../components/Visualization';
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
    const fetchMock = vi.spyOn(window, 'fetch');

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

    vi.spyOn(CatalogSchemaLoader, 'fetchFile').mockImplementation((uri: string) => {
      return Promise.resolve({ uri, body: { [uri]: 'dummy-data' } });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderRouteVisualization = () =>
    render(
      <RouteVisualization
        catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
        runtimeCatalogName=""
        testingCatalogName=""
        code={camelRouteYaml}
        codeChange={vi.fn()}
      />,
    );

  it('renders the canvas from the code prop without throwing', async () => {
    renderRouteVisualization();

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

  it('provides the suggestion registry that the forms of the side panel require', async () => {
    // The side panel forms register their suggestion providers through useSuggestionRegistry(),
    // which throws without a SuggestionRegistryProvider above the canvas.
    let hasSuggestionRegistry = false;
    vi.spyOn(VisualizationModule, 'DesignerVisualization').mockImplementation(() => {
      hasSuggestionRegistry = useSuggestionRegistry() !== undefined;
      return <div data-testid="designer-visualization" />;
    });

    renderRouteVisualization();

    for (let i = 0; i < 5 && !screen.queryByTestId('designer-visualization'); i++) {
      await act(async () => {
        fetchResolve();
      });
    }

    expect(screen.getByTestId('designer-visualization')).toBeInTheDocument();
    expect(hasSuggestionRegistry).toBe(true);
  });
});
