import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import type { MockInstance } from 'vitest';

import { CitrusTestSchemaService } from '../models/visualization/flows/support/citrus-test-schema.service';
import { ReloadContext } from '../providers/reload.provider';
import { TestRuntimeProviderWrapper } from '../stubs';
import { citrusCatalogSelector, getFirstCatalogMap, getFirstCitrusCatalogMap } from '../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { CatalogLoaderProvider } from './catalog.provider';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('CatalogLoaderProvider', () => {
  let fetchMock: MockInstance<typeof fetch>;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    // The individual catalog files fetched by fetchCamelCatalog() resolve to empty catalogs
    fetchMock.mockImplementation(async () => new Response('{}'));
    fetchMock.mockImplementationOnce(() => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve(new Response(JSON.stringify(catalogDefinition)));
        };
        fetchReject = () => {
          reject(new Error('Error'));
        };
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading mode', async () => {
    const { Provider } = TestRuntimeProviderWrapper();
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper();
    render(
      <ReloadContext.Provider value={{ reloadPage: vi.fn(), lastRender: 0 }}>
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>
      </ReloadContext.Provider>,
    );

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some catalog files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper();
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
  });

  it('should call fetchCamelCatalog for a Camel catalog', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper();
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(`${relativeBasePath}/${catalogDefinition.catalogs.components.file}`);
    expect(fetchMock).toHaveBeenCalledWith(`${relativeBasePath}/${catalogDefinition.catalogs.kamelets.file}`);
  });

  it('should set loading to false after fetching the catalogs', async () => {
    const { Provider } = TestRuntimeProviderWrapper();
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('catalogs-loaded')).toBeInTheDocument();
  });
});

describe('CitrusCatalogLoaderProvider', () => {
  let fetchMock: MockInstance<typeof fetch>;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    // The individual catalog files fetched by fetchCitrusCatalog() resolve to empty catalogs
    fetchMock.mockImplementation(async () => new Response('{}'));
    fetchMock.mockImplementationOnce(() => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve(new Response(JSON.stringify(catalogDefinition)));
        };
        fetchReject = () => {
          reject(new Error('Error'));
        };
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading mode', async () => {
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    render(
      <ReloadContext.Provider value={{ reloadPage: vi.fn(), lastRender: 0 }}>
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>
      </ReloadContext.Provider>,
    );

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some catalog files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
  });

  it('should call fetchCitrusCatalog for a Citrus catalog', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(`${relativeBasePath}/${catalogDefinition.catalogs.actions.file}`);
    expect(fetchMock).toHaveBeenCalledWith(`${relativeBasePath}/${catalogDefinition.catalogs.containers.file}`);
  });

  it('should set loading to false after fetching the catalogs', async () => {
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    render(
      <Provider>
        <CatalogLoaderProvider>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>
      </Provider>,
    );

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('catalogs-loaded')).toBeInTheDocument();
  });
});

describe('CatalogLoaderProvider cleanup', () => {
  let clearKindMapSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearKindMapSpy = vi.spyOn(CitrusTestSchemaService, 'clearKindMap');
  });

  afterEach(() => {
    clearKindMapSpy.mockRestore();
  });

  it('should call CitrusTestSchemaService.clearKindMap on unmount', async () => {
    const { Provider } = TestRuntimeProviderWrapper();
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ runtime: 'Camel' })));

    const { unmount } = render(
      <Provider>
        <CatalogLoaderProvider>{null}</CatalogLoaderProvider>
      </Provider>,
    );
    unmount();
    expect(clearKindMapSpy).toHaveBeenCalledOnce();
  });
});
