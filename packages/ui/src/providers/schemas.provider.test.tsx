import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../models';
import { TestRuntimeProviderWrapper } from '../stubs';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { ReloadContext } from './reload.provider';
import { SchemasLoaderProvider } from './schemas.provider';

describe('SchemasLoaderProvider', () => {
  let fetchMock: jest.SpyInstance;
  let getSchemasFilesMock: jest.SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;
  const [catalogLibraryEntry] = catalogLibrary.definitions;

  beforeAll(async () => {
    catalogDefinition = (await import(`@kaoto/camel-catalog/${catalogLibraryEntry.fileName}`)).default;
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(window, 'fetch');
    fetchMock.mockImplementationOnce((file) => {
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

    getSchemasFilesMock = jest.spyOn(CatalogSchemaLoader, 'getSchemasFiles');
    getSchemasFilesMock.mockReturnValueOnce([Promise.resolve]);

    jest.spyOn(CatalogSchemaLoader, 'fetchFile').mockResolvedValueOnce({
      uri: 'http://localhost',
      body: {} as KaotoSchemaDefinition['schema'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: jest.fn(), lastRender: 0 }}>
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
