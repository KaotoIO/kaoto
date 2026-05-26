import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../models/camel';
import { KaotoResource } from '../models/kaoto-resource';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { KaotoResourceContext } from './kaoto-resource.provider';
import { ReloadContext } from './reload.provider';
import { RuntimeProvider } from './runtime.provider';

/**
 * A small, deterministic catalog library so the catalog-selection assertions don't
 * depend on whichever versions happen to ship in the real index.json. The newest
 * entry per runtime is the implicit default (see `findCatalog`), so naming an older
 * entry proves the settings-driven selection actually overrides the default.
 */
const CONTROLLED_LIBRARY: CatalogLibrary = {
  name: 'test-library',
  version: 1,
  definitions: [
    { name: 'Main Old', runtime: 'Main', version: '1.0.0', fileName: 'main-old.json' },
    { name: 'Main New', runtime: 'Main', version: '2.0.0', fileName: 'main-new.json' },
    { name: 'Citrus Old', runtime: 'Citrus', version: '1.0.0', fileName: 'citrus-old.json' },
    { name: 'Citrus New', runtime: 'Citrus', version: '2.0.0', fileName: 'citrus-new.json' },
  ],
};

/** Renders `ui` under a KaotoResourceContext whose resource reports the given schema type. */
const renderInRuntime = (ui: ReactNode, schemaType: SourceSchemaType = SourceSchemaType.Integration) => {
  const kaotoResource = { getType: () => schemaType } as unknown as KaotoResource;
  return render(<KaotoResourceContext.Provider value={{ kaotoResource }}>{ui}</KaotoResourceContext.Provider>);
};

/** Surfaces the catalog the provider settled on so tests can assert against it. */
const SelectedCatalogProbe = () => {
  const { selectedCatalog } = useRuntimeContext();
  return <span data-testid="selected-catalog">{selectedCatalog?.name ?? 'none'}</span>;
};

describe('RuntimeProvider', () => {
  let fetchMock: jest.SpyInstance;
  let fetchResolve: () => void;
  let fetchReject: () => void;

  beforeEach(() => {
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
      renderInRuntime(
        <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
          <span data-testid="library-loaded">Loaded</span>
        </RuntimeProvider>,
      );
    });

    expect(screen.getByTestId('loading-library')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    await act(async () => {
      renderInRuntime(
        <ReloadContext.Provider value={{ reloadPage: jest.fn(), lastRender: 0 }}>
          <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
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
      renderInRuntime(
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
        >
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
      renderInRuntime(
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
        >
          <span data-testid="library-loaded">Loaded</span>
        </RuntimeProvider>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('library-loaded')).toBeInTheDocument();
  });

  describe('catalog selection from settings', () => {
    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue({ json: () => CONTROLLED_LIBRARY } as unknown as Response);
    });

    it('selects the catalog named by runtimeCatalogName for non-test sources', async () => {
      renderInRuntime(
        <RuntimeProvider catalogUrl="/index.json" runtimeCatalogName="Main Old" testingCatalogName="Citrus New">
          <SelectedCatalogProbe />
        </RuntimeProvider>,
        SourceSchemaType.Integration,
      );

      // 'Main New' is the newest Main and would be the default; the setting overrides it.
      expect(await screen.findByTestId('selected-catalog')).toHaveTextContent('Main Old');
    });

    it('selects the catalog named by testingCatalogName for test sources', async () => {
      renderInRuntime(
        <RuntimeProvider catalogUrl="/index.json" runtimeCatalogName="Main New" testingCatalogName="Citrus Old">
          <SelectedCatalogProbe />
        </RuntimeProvider>,
        SourceSchemaType.Test,
      );

      // Test sources read testingCatalogName, not runtimeCatalogName.
      expect(await screen.findByTestId('selected-catalog')).toHaveTextContent('Citrus Old');
    });

    it('falls back to the default catalog when the configured name is not found', async () => {
      renderInRuntime(
        <RuntimeProvider catalogUrl="/index.json" runtimeCatalogName="Does Not Exist" testingCatalogName="">
          <SelectedCatalogProbe />
        </RuntimeProvider>,
        SourceSchemaType.Integration,
      );

      // No match -> findCatalog default -> newest Main.
      expect(await screen.findByTestId('selected-catalog')).toHaveTextContent('Main New');
    });
  });
});
