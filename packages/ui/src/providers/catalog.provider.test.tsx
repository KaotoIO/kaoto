import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { CamelCatalogService, CatalogKind } from '../models';
import { TestRuntimeProviderWrapper } from '../stubs';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { CatalogLoaderProvider } from './catalog.provider';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { ReloadContext } from './reload.context';

describe('CatalogLoaderProvider', () => {
  let fetchMock: jest.SpyInstance;
  let fetchFileMock: jest.SpyInstance;
  let setCatalogKeySpy: jest.SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;
  let catalogDefinition: CatalogDefinition;
  const [catalogLibraryEntry] = catalogLibrary.definitions;
  const catalogPath = catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/'));

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
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

    fetchFileMock = jest.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return new Promise((resolve) => {
        resolve({ body: { [uri]: 'dummy-data' } });
      });
    });
    setCatalogKeySpy = jest.spyOn(CamelCatalogService, 'setCatalogKey');
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    const { Provider } = TestRuntimeProviderWrapper();
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: jest.fn(), lastRender: 0 }}>
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

    expect(fetchMock).toHaveBeenCalledWith(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${selectedCatalog!.fileName}`);
  });

  it('should fetch the subsequent catalog files', async () => {
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

    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-components`,
      ),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-models`,
      ),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-patterns`,
      ),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-languages`,
      ),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-dataformats`,
      ),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/kamelets-aggregate`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/kamelet-boundaries`),
    );
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

  it('should load the CamelCatalogService', async () => {
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

    let count = 0;
    setCatalogKeySpy.mock.calls.forEach((call) => {
      if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-components`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Component);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-models`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Processor);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        expect(Object.values(call[1])[1]).toMatchSnapshot();
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-patterns`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Pattern);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        expect(Object.values(call[1])[1]).toMatchSnapshot();
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-entities`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Entity);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-languages`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Language);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-dataformats`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Dataformat);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/camel-catalog-aggregate-loadbalancers`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Loadbalancer);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].includes(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/kamelet-boundaries`,
        )
      ) {
        expect(call[0]).toEqual(CatalogKind.Kamelet);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        expect(Object.keys(call[1])[1]).toContain(
          `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/${catalogPath}/kamelets-aggregate`,
        );
        expect(Object.values(call[1])[1]).toEqual('dummy-data');
        count++;
      } else {
        throw new Error(call);
      }
    });
    expect(count).toEqual(setCatalogKeySpy.mock.calls.length);
  });
});
