import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { KaotoSchemaDefinition } from '../models';
import { TestRuntimeProviderWrapper } from '../stubs';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { ReloadContext } from './reload.provider';
import { SchemasLoaderProvider } from './schemas.provider';

describe('SchemasLoaderProvider', () => {
  let fetchMock: MockInstance;
  let getSchemasFilesMock: MockInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;
  const [catalogLibraryEntry] = catalogLibrary.definitions;

  beforeAll(async () => {
    catalogDefinition = (await import(`@kaoto/camel-catalog/${catalogLibraryEntry.fileName}`)).default;
  });

  beforeEach(() => {
    fetchMock = vi.spyOn(window, 'fetch');
    fetchMock.mockImplementationOnce((file: string) => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogDefinition,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
        fetchReject = () => {
          reject(new Error('Error'));
        };
      });
    });

    getSchemasFilesMock = vi.spyOn(CatalogSchemaLoader, 'getSchemasFiles');
    getSchemasFilesMock.mockReturnValueOnce([Promise.resolve]);

    vi.spyOn(CatalogSchemaLoader, 'fetchFile').mockResolvedValueOnce({
      uri: 'http://localhost',
      body: {} as KaotoSchemaDefinition['schema'],
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
          <SchemasLoaderProvider>
            <span data-testid="schemas-loaded">Loaded</span>
          </SchemasLoaderProvider>
        </Provider>,
      );
    });

    expect(screen.getByTestId('loading-schemas')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: vi.fn(), lastRender: 0 }}>
          <Provider>
            <SchemasLoaderProvider>
              <span data-testid="schemas-loaded">Loaded</span>
            </SchemasLoaderProvider>
          </Provider>
        </ReloadContext.Provider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some schema files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <Provider>
          <SchemasLoaderProvider>
            <span data-testid="schemas-loaded">Loaded</span>
          </SchemasLoaderProvider>
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

  it('should fetch the subsequent schemas files', async () => {
    const { Provider, selectedCatalog } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <Provider>
          <SchemasLoaderProvider>
            <span data-testid="schemas-loaded">Loaded</span>
          </SchemasLoaderProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(getSchemasFilesMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${selectedCatalog!.fileName}`,
      catalogDefinition.schemas,
    );
  });
});
