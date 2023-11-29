import catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { act, render, screen } from '@testing-library/react';
import { CamelCatalogService, CatalogKind } from '../models';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { CatalogLoaderProvider } from './catalog.provider';

describe('CatalogLoaderProvider', () => {
  let fetchMock: jest.SpyInstance;
  let fetchFileMock: jest.SpyInstance;
  let setCatalogKeySpy: jest.SpyInstance;
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

    fetchFileMock = jest.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return new Promise((resolve) => {
        resolve({ body: { uri } });
      });
    });
    setCatalogKeySpy = jest.spyOn(CamelCatalogService, 'setCatalogKey');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start in loading mode', async () => {
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should stay in loading mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByTestId('loading-catalogs')).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/index.json`);
  });

  it('should fetch the subsequent catalog files', async () => {
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchFileMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-components.json`,
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-models.json`,
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-patterns.json`,
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-languages.json`,
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-dataformats.json`,
    );
    expect(fetchFileMock).toHaveBeenCalledWith(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/kamelets-aggregate.json`);
    expect(fetchFileMock).toHaveBeenCalledWith(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/kamelet-boundaries.json`);
  });

  it('should set loading to false after fetching the catalogs', async () => {
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('catalogs-loaded')).toBeInTheDocument();
  });

  it('should load the CamelCatalogService', async () => {
    await act(async () => {
      render(
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="catalogs-loaded">Loaded</span>
        </CatalogLoaderProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Component, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-components.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Processor, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-models.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Pattern, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-patterns.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Language, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-languages.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Dataformat, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/camel-catalog-aggregate-dataformats.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.Kamelet, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/kamelets-aggregate.json`,
    });
    expect(setCatalogKeySpy).toHaveBeenCalledWith(CatalogKind.KameletBoundary, {
      uri: `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/kamelet-boundaries.json`,
    });
  });
});
