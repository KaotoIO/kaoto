import catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { act, render, screen } from '@testing-library/react';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { SchemasLoaderProvider } from './schemas.provider';

describe('SchemasLoaderProvider', () => {
  let fetchMock: jest.SpyInstance;
  let getSchemasFilesMock: jest.SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;

  beforeEach(() => {
    fetchMock = jest.spyOn(window, 'fetch');
    fetchMock.mockImplementationOnce((file) => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogIndex,
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start in loading mode', async () => {
    await act(async () => {
      render(
        <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="schemas-loaded">Loaded</span>
        </SchemasLoaderProvider>,
      );
    });

    expect(screen.getByTestId('loading-schemas')).toBeInTheDocument();
  });

  it('should stay in loading mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    await act(async () => {
      render(
        <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="schemas-loaded">Loaded</span>
        </SchemasLoaderProvider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByTestId('loading-schemas')).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    await act(async () => {
      render(
        <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="schemas-loaded">Loaded</span>
        </SchemasLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/index.json`);
  });

  it('should fetch the subsequent schemas files', async () => {
    await act(async () => {
      render(
        <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="schemas-loaded">Loaded</span>
        </SchemasLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(getSchemasFilesMock).toHaveBeenCalledWith(CatalogSchemaLoader.DEFAULT_CATALOG_PATH, catalogIndex.schemas);
  });
});
