import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { Mock } from 'vitest';

import { ReloadContext } from '../providers/reload.provider';
import { TestRuntimeProviderWrapper } from '../stubs';
import { citrusCatalogSelector, getFirstCatalogMap, getFirstCitrusCatalogMap } from '../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { CatalogLoaderProvider } from './catalog.provider';
import { fetchCamelCatalog } from './support/fetch-camel-catalog';
import { fetchCitrusCatalog } from './support/fetch-citrus-catalog';

vi.mock('./support/fetch-camel-catalog');
vi.mock('./support/fetch-citrus-catalog');

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('CatalogLoaderProvider', () => {
  let fetchMock: SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    (fetchCamelCatalog as Mock).mockResolvedValue(undefined);

    fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockImplementationOnce((file: string | Request) => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogDefinition,
            url: `http://localhost/${file}`,
          } as unknown);
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
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: vi.fn(), lastRender: 0 }}>
          <Provider>
            <CatalogLoaderProvider>
              <span data-testid="catalogs-loaded">Loaded</span>
            </CatalogLoaderProvider>
          </Provider>
        </ReloadContext.Provider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some catalog files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
  });

  it('should call fetchCamelCatalog for a Camel catalog', async () => {
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchCamelCatalog).toHaveBeenCalledTimes(1);
  });

  it('should set loading to false after fetching the catalogs', async () => {
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('catalogs-loaded')).toBeInTheDocument();
  });
});

describe('CitrusCatalogLoaderProvider', () => {
  let fetchMock: SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    (fetchCitrusCatalog as Mock).mockResolvedValue(undefined);

    fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockImplementationOnce((file: string | Request) => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogDefinition,
            url: `http://localhost/${file}`,
          } as unknown);
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
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: vi.fn(), lastRender: 0 }}>
          <Provider>
            <CatalogLoaderProvider>
              <span data-testid="catalogs-loaded">Loaded</span>
            </CatalogLoaderProvider>
          </Provider>
        </ReloadContext.Provider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some catalog files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
    );
  });

  it('should call fetchCitrusCatalog for a Citrus catalog', async () => {
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchCitrusCatalog).toHaveBeenCalledTimes(1);
  });

  it('should set loading to false after fetching the catalogs', async () => {
    const { Provider } = TestRuntimeProviderWrapper(citrusCatalogSelector);
    await act(async () => {
      render(
        <Provider>
          <CatalogLoaderProvider>
            <span data-testid="catalogs-loaded">Loaded</span>
          </CatalogLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('catalogs-loaded')).toBeInTheDocument();
  });
});
