import defaultCatalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';

import { SourceSchemaType } from '../models/camel';
import { CatalogVersion } from '../models/settings/settings.model';
import { CatalogSchemaLoader } from '../utils/catalog-schema-loader';
import { EntitiesContext, EntitiesContextResult } from './entities.provider';
import { ReloadContext } from './reload.provider';
import { RuntimeContext, RuntimeProvider } from './runtime.provider';

describe('RuntimeProvider', () => {
  const defaultCamelCatalog: CatalogVersion = { version: '', runtime: 'Main' };
  const defaultTestingCatalog: CatalogVersion = { version: '', runtime: 'Citrus' };

  const RuntimeProbe: FunctionComponent = () => {
    const runtime = useContext(RuntimeContext);

    return (
      <>
        <span data-testid="library-loaded">Loaded</span>
        <span data-testid="selected-runtime">{runtime?.selectedCatalog?.runtime ?? ''}</span>
        <span data-testid="selected-version">{runtime?.selectedCatalog?.version ?? ''}</span>
      </>
    );
  };

  const mockCatalogFetch = (catalog: CatalogLibrary = defaultCatalogLibrary) =>
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => catalog,
      url: `http://localhost/${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}`,
    } as unknown as Response);

  const mockCatalogFetchError = () => jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Error'));

  const renderRuntimeProvider = ({
    catalogUrl = CatalogSchemaLoader.DEFAULT_CATALOG_PATH,
    camelCatalog = defaultCamelCatalog,
    testingCatalog = defaultTestingCatalog,
    entitiesContext,
    withReloadContext = false,
    children = <span data-testid="library-loaded">Loaded</span>,
  }: {
    catalogUrl?: string;
    camelCatalog?: CatalogVersion;
    testingCatalog?: CatalogVersion;
    entitiesContext?: EntitiesContextResult;
    withReloadContext?: boolean;
    children?: React.ReactNode;
  } = {}) => {
    const content = (
      <RuntimeProvider catalogUrl={catalogUrl} camelCatalog={camelCatalog} testingCatalog={testingCatalog}>
        {children}
      </RuntimeProvider>
    );

    const withEntities = entitiesContext ? (
      <EntitiesContext.Provider value={entitiesContext}>{content}</EntitiesContext.Provider>
    ) : (
      content
    );

    const mockReloadContextValue = { reloadPage: jest.fn(), lastRender: 0 };

    const Wrapper = ({ children: wrapperChildren }: PropsWithChildren) =>
      withReloadContext ? (
        <ReloadContext.Provider value={mockReloadContextValue}>{wrapperChildren}</ReloadContext.Provider>
      ) : (
        <>{wrapperChildren}</>
      );

    render(withEntities, { wrapper: Wrapper });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start in loading mode', () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

    renderRuntimeProvider({ catalogUrl: '' });

    expect(screen.getByTestId('loading-library')).toBeInTheDocument();
  });

  it('should stay in Error mode when there is an error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCatalogFetchError();

    renderRuntimeProvider({ catalogUrl: '', withReloadContext: true });

    expect(await screen.findByText(/Some catalog library files might not be available./)).toBeInTheDocument();
  });

  it('should fetch the index.json catalog file', async () => {
    const fetchMock = mockCatalogFetch();

    renderRuntimeProvider();

    await screen.findByTestId('library-loaded');

    expect(fetchMock).toHaveBeenCalledWith(CatalogSchemaLoader.DEFAULT_CATALOG_PATH);
  });

  it('should render children when the index.json file is loaded', async () => {
    mockCatalogFetch();

    renderRuntimeProvider();

    expect(await screen.findByTestId('library-loaded')).toBeInTheDocument();
  });

  it('should fall back to a runtime-compatible camel catalog when exact version is missing', async () => {
    mockCatalogFetch({
      name: 'Custom Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Quarkus 4.18.1', runtime: 'Quarkus', version: '4.18.1' },
        { name: 'Camel Main 4.18.1', runtime: 'Main', version: '4.18.1' },
      ] as CatalogLibrary['definitions'],
    });

    renderRuntimeProvider({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '9.9.9', runtime: 'Quarkus' },
      children: <RuntimeProbe />,
    });

    expect(await screen.findByTestId('selected-runtime')).toHaveTextContent('Quarkus');
    expect(screen.getByTestId('selected-version')).toHaveTextContent('4.18.1');
  });

  it('should fall back to a runtime-compatible testing catalog when exact version is missing', async () => {
    mockCatalogFetch({
      name: 'Custom Catalog',
      version: 1,
      definitions: [{ name: 'Citrus 4.10.2', runtime: 'Citrus', version: '4.10.2' }] as CatalogLibrary['definitions'],
    });

    renderRuntimeProvider({
      catalogUrl: 'http://example.com/custom.json',
      testingCatalog: { version: '9.9.9', runtime: 'Citrus' },
      entitiesContext: {
        currentSchemaType: SourceSchemaType.Test,
        camelResource: {
          getCompatibleRuntimes: () => [],
        },
      } as unknown as EntitiesContextResult,
      children: <RuntimeProbe />,
    });

    expect(await screen.findByTestId('selected-runtime')).toHaveTextContent('Citrus');
    expect(screen.getByTestId('selected-version')).toHaveTextContent('4.10.2');
  });
});
