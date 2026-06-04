import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { useContext } from 'react';

import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { ReloadContext } from './reload.provider';
import { RuntimeContext, RuntimeProvider } from './runtime.provider';

const SelectedCatalogDisplay = () => {
  const ctx = useContext(RuntimeContext);
  return <span data-testid="selected-catalog">{ctx?.selectedCatalog?.name ?? 'none'}</span>;
};

describe('RuntimeProvider', () => {
  let fetchMock: jest.SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest.spyOn(window, 'fetch');
    fetchMock.mockImplementationOnce((file) => {
      return new Promise((resolve, reject) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogLibrary,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
        fetchReject = () => {
          reject(new Error('Error'));
        };
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start in loading mode', async () => {
    await act(async () => {
      render(
        <RuntimeProvider catalogUrl="">
          <span data-testid="library-loaded">Loaded</span>
        </RuntimeProvider>,
      );
    });

    expect(screen.getByTestId('loading-library')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: jest.fn(), lastRender: 0 }}>
          <RuntimeProvider catalogUrl="">
            <span data-testid="library-loaded">Loaded</span>
          </RuntimeProvider>
        </ReloadContext.Provider>,
      );
    });

    await act(async () => {
      fetchReject();
    });

    expect(screen.getByText(/Some catalog library files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    await act(async () => {
      render(
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="library-loaded">Loaded</span>
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(CatalogSchemaLoader.DEFAULT_CATALOG_PATH);
  });

  it('should render children when the index.json file is loaded', async () => {
    await act(async () => {
      render(
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <span data-testid="library-loaded">Loaded</span>
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('library-loaded')).toBeInTheDocument();
  });

  it('should select catalog matching runtimeCatalogName from settings', async () => {
    const lib = catalogLibrary as CatalogLibrary;
    const targetCatalog = lib.definitions.find((c) => c.runtime === 'Main');

    await act(async () => {
      render(
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH} runtimeCatalogName={targetCatalog!.name}>
          <SelectedCatalogDisplay />
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('selected-catalog').textContent).toBe(targetCatalog!.name);
  });

  it('should prefer runtimeCatalogName over localStorage selectedCatalog', async () => {
    const lib = catalogLibrary as CatalogLibrary;
    const mainCatalogs = lib.definitions.filter((c) => c.runtime === 'Main');
    const settingsCatalog = mainCatalogs[0];
    const localStorageCatalog = mainCatalogs.length > 1 ? mainCatalogs[1] : mainCatalogs[0];

    localStorage.setItem('selectedCatalog', JSON.stringify(localStorageCatalog));

    await act(async () => {
      render(
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName={settingsCatalog.name}
        >
          <SelectedCatalogDisplay />
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('selected-catalog').textContent).toBe(settingsCatalog.name);
  });

  it('should fall back to findCatalog when runtimeCatalogName is empty', async () => {
    await act(async () => {
      render(
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH} runtimeCatalogName="">
          <SelectedCatalogDisplay />
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('selected-catalog').textContent).not.toBe('none');
  });
});
