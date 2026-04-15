import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen, waitFor } from '@testing-library/react';

import { SourceSchemaType } from '../models/camel';
import { LocalStorageKeys } from '../models/local-storage-keys';
import { useSourceCodeStore } from '../store';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { ReloadContext } from './reload.provider';
import { RuntimeContext, RuntimeProvider } from './runtime.provider';
import { SourceCodeProvider } from './source-code.provider';

const camelEntry = {
  name: 'Camel Main 1.0.0.redhat-00001',
  runtime: 'Main',
  version: '1.0.0.redhat-00001',
  fileName: 'camel-main/index.js',
};

const citrusEntry = {
  name: 'Citrus 1.0.0',
  runtime: 'Citrus',
  version: '1.0.0',
  fileName: 'citrus/1.0.0/index.js',
};

const mockCatalogLibrary: CatalogLibrary = {
  name: 'Catalog',
  version: 1,
  definitions: [camelEntry, citrusEntry],
} as unknown as CatalogLibrary;

/**
 * A valid Citrus YAML: the root object must have an 'actions' array
 * (not wrapped in an array) for CitrusTestResourceFactory to detect it.
 */
const CITRUS_YAML = `
name: sample-test
actions: []
`;

describe('RuntimeProvider — loading states (existing tests)', () => {
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
});

/**
 * Integration tests for compatibility-based catalog selection.
 *
 * The hierarchy here matches production: SourceCodeProvider wraps
 * RuntimeProvider. RuntimeProvider derives the compatible-runtimes signal
 * by calling `detectSchemaType` on the source code + path, then looking
 * up the static `COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE` registry.
 */
describe('RuntimeProvider — catalog selection', () => {
  beforeEach(() => {
    localStorage.clear();
    useSourceCodeStore.getState().setSourceCode('');
    useSourceCodeStore.getState().setPath(undefined);
    (global as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(mockCatalogLibrary) });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const renderWithSource = (sourceCode: string) => {
    const captured: { selectedCatalog?: { name: string } } = {};
    const Capture = () => (
      <RuntimeContext.Consumer>
        {(ctx) => {
          if (ctx?.selectedCatalog) {
            captured.selectedCatalog = ctx.selectedCatalog as { name: string };
          }
          return null;
        }}
      </RuntimeContext.Consumer>
    );
    render(
      <SourceCodeProvider initialSourceCode={sourceCode}>
        <RuntimeProvider catalogUrl="http://fake/index.json">
          <Capture />
        </RuntimeProvider>
      </SourceCodeProvider>,
    );
    return captured;
  };

  it('picks a compatible catalog when no value is persisted', async () => {
    const captured = renderWithSource('');
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(camelEntry.name));
  });

  it('uses the persisted catalog when it is compatible with the current resource', async () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify({ [SourceSchemaType.Route]: camelEntry }));
    const captured = renderWithSource('');
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(camelEntry.name));
  });

  it('ignores an incompatible persisted catalog and falls back to findCatalog', async () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify({ [SourceSchemaType.Route]: citrusEntry }));
    const captured = renderWithSource('');
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(camelEntry.name));
  });

  it('ignores the legacy single-entry shape and selects the compatible catalog', async () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(citrusEntry));
    const captured = renderWithSource('');
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(camelEntry.name));
  });

  it('selects the Citrus catalog when loading a Citrus resource', async () => {
    const captured = renderWithSource(CITRUS_YAML);
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(citrusEntry.name));
  });

  it('selects the Citrus catalog for a Citrus resource even when a Camel catalog is persisted', async () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify({ [SourceSchemaType.Route]: camelEntry }));
    const captured = renderWithSource(CITRUS_YAML);
    await waitFor(() => expect(captured.selectedCatalog?.name).toEqual(citrusEntry.name));
  });
});
