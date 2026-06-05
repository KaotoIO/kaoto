import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { act, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { SourceSchemaType } from '../models/camel';
import { KaotoResource } from '../models/kaoto-resource';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { KaotoResourceContext } from './kaoto-resource.provider';
import { ReloadContext } from './reload.provider';
import { RuntimeProvider } from './runtime.provider';

const kaotoResource = { getType: () => SourceSchemaType.Route } as unknown as KaotoResource;

const KaotoResourceWrapper = ({ children }: PropsWithChildren) => (
  <KaotoResourceContext.Provider value={{ kaotoResource }}>{children}</KaotoResourceContext.Provider>
);

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
      render(
        <KaotoResourceWrapper>
          <RuntimeProvider catalogUrl="">
            <span data-testid="library-loaded">Loaded</span>
          </RuntimeProvider>
        </KaotoResourceWrapper>,
      );
    });

    expect(screen.getByTestId('loading-library')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    await act(async () => {
      render(
        <ReloadContext.Provider value={{ reloadPage: jest.fn(), lastRender: 0 }}>
          <KaotoResourceWrapper>
            <RuntimeProvider catalogUrl="">
              <span data-testid="library-loaded">Loaded</span>
            </RuntimeProvider>
          </KaotoResourceWrapper>
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
        <KaotoResourceWrapper>
          <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
            <span data-testid="library-loaded">Loaded</span>
          </RuntimeProvider>
        </KaotoResourceWrapper>,
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
        <KaotoResourceWrapper>
          <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
            <span data-testid="library-loaded">Loaded</span>
          </RuntimeProvider>
        </KaotoResourceWrapper>,
      );
    });

    await act(async () => {
      fetchResolve();
    });

    expect(screen.getByTestId('library-loaded')).toBeInTheDocument();
  });
});
