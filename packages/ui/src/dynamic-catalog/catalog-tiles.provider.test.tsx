import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';

import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { ITile } from '../components/Catalog';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { CatalogContext } from './catalog.provider';
import { CatalogTilesContext, CatalogTilesProvider } from './catalog-tiles.provider';
import { DynamicCatalog } from './dynamic-catalog';
import { DynamicCatalogRegistry } from './dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from './models';
import { CamelComponentsProvider, CamelProcessorsProvider } from './providers/camel-components.provider';
import { CamelKameletsProvider } from './providers/camel-kamelets.provider';

jest.mock('../camel-utils', () => {
  const actual = jest.requireActual('../camel-utils');

  return {
    ...actual,
    camelComponentToTile: jest.fn(),
    camelProcessorToTile: jest.fn(),
    camelEntityToTile: jest.fn(),
    kameletToTile: jest.fn(),
  };
});

describe('CatalogTilesProvider', () => {
  let mockRegistry: IDynamicCatalogRegistry;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Create catalogs using actual providers with proper types
    const componentCatalog = new DynamicCatalog<ICamelComponentDefinition>(
      new CamelComponentsProvider(catalogsMap.componentCatalogMap),
    );
    const patternCatalog = new DynamicCatalog<ICamelProcessorDefinition>(
      new CamelProcessorsProvider(catalogsMap.patternCatalogMap),
    );
    const entityCatalog = new DynamicCatalog<ICamelProcessorDefinition>(
      new CamelProcessorsProvider(catalogsMap.entitiesCatalog),
    );
    const kameletCatalog = new DynamicCatalog<IKameletDefinition>(
      new CamelKameletsProvider(
        {
          ...catalogsMap.kameletsCatalogMap,
          ...catalogsMap.kameletsBoundariesCatalog,
        },
        undefined,
      ),
    );

    // Setup mock registry
    mockRegistry = DynamicCatalogRegistry.get();
    mockRegistry.setCatalog(CatalogKind.Component, componentCatalog);
    mockRegistry.setCatalog(CatalogKind.Pattern, patternCatalog);
    mockRegistry.setCatalog(CatalogKind.Entity, entityCatalog);
    mockRegistry.setCatalog(CatalogKind.Kamelet, kameletCatalog);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', async () => {
    await act(async () => {
      render(
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>
            <span data-testid="tiles-loaded">Loaded</span>
          </CatalogTilesProvider>
        </CatalogContext.Provider>,
      );
    });

    expect(screen.getByTestId('tiles-loaded')).toBeInTheDocument();
  });

  it('should provide fetchTiles and getTiles functions through context', async () => {
    const {
      result: { current },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    expect(current).toBeDefined();
    expect(current?.fetchTiles).toBeInstanceOf(Function);
    expect(current?.getTiles).toBeInstanceOf(Function);
  });

  it('should build the tiles when fetchTiles is called', async () => {
    const componentCatalog = mockRegistry.getCatalog(CatalogKind.Component);
    const patternCatalog = mockRegistry.getCatalog(CatalogKind.Pattern);
    const kameletCatalog = mockRegistry.getCatalog(CatalogKind.Kamelet);

    const getAllSpyComponent = jest.spyOn(componentCatalog!, 'getAll');
    const getAllSpyPattern = jest.spyOn(patternCatalog!, 'getAll');
    const getAllSpyKamelet = jest.spyOn(kameletCatalog!, 'getAll');

    const {
      result: { current: context },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    await act(async () => {
      await context?.fetchTiles();
    });

    // Verify catalogs were queried
    expect(getAllSpyComponent).toHaveBeenCalled();
    expect(getAllSpyPattern).toHaveBeenCalled();
    expect(getAllSpyKamelet).toHaveBeenCalled();

    // Verify tiles were built by checking getTiles returns non-empty array
    const tiles = context?.getTiles();
    expect(tiles).toBeDefined();
    expect(tiles!.length).toBeGreaterThan(0);
  });

  it('should call getAll on all catalog kinds', async () => {
    const {
      result: { current: context },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    const componentCatalog = mockRegistry.getCatalog(CatalogKind.Component);
    const patternCatalog = mockRegistry.getCatalog(CatalogKind.Pattern);
    const entityCatalog = mockRegistry.getCatalog(CatalogKind.Entity);
    const kameletCatalog = mockRegistry.getCatalog(CatalogKind.Kamelet);

    const getAllSpyComponent = jest.spyOn(componentCatalog!, 'getAll');
    const getAllSpyPattern = jest.spyOn(patternCatalog!, 'getAll');
    const getAllSpyEntity = jest.spyOn(entityCatalog!, 'getAll');
    const getAllSpyKamelet = jest.spyOn(kameletCatalog!, 'getAll');

    await act(async () => {
      await context?.fetchTiles();
    });

    expect(getAllSpyComponent).toHaveBeenCalled();
    expect(getAllSpyPattern).toHaveBeenCalled();
    expect(getAllSpyEntity).toHaveBeenCalled();
    expect(getAllSpyKamelet).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('should avoid building the tiles if the catalog is empty', async () => {
    const emptyRegistry: IDynamicCatalogRegistry = {
      setCatalog: jest.fn(),
      getCatalog: jest.fn().mockReturnValue(undefined),
      getEntity: jest.fn(),
      getEntityFromCache: jest.fn(),
      clearRegistry: jest.fn(),
    };

    const {
      result: { current: context },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={emptyRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    await act(async () => {
      await context?.fetchTiles();
    });

    expect(camelComponentToTile).not.toHaveBeenCalled();
    expect(camelProcessorToTile).not.toHaveBeenCalled();
    expect(kameletToTile).not.toHaveBeenCalled();
  });

  it('should return combined tiles from all catalog kinds', async () => {
    const mockComponentTile = { id: 'component-1', name: 'Component', type: 'component' };
    const mockProcessorTile = { id: 'processor-1', name: 'Processor', type: 'processor' };
    const mockKameletTile = { id: 'kamelet-1', name: 'Kamelet', type: 'kamelet' };

    (camelComponentToTile as jest.Mock).mockReturnValue(mockComponentTile);
    (camelProcessorToTile as jest.Mock).mockReturnValue(mockProcessorTile);
    (kameletToTile as jest.Mock).mockReturnValue(mockKameletTile);

    const {
      result: { current: context },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    let tiles: ITile[] | undefined;
    await act(async () => {
      tiles = await context?.fetchTiles();
    });

    expect(Array.isArray(tiles)).toBe(true);
    expect(tiles?.length).toBeGreaterThan(0);
  });

  it('should use the callback dependency on catalogRegistry', async () => {
    const { result, rerender } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    const firstContext = result.current;
    await act(async () => {
      rerender();
    });

    // The context reference should be the same since the registry hasn't changed
    expect(firstContext).toBe(result.current);
  });

  it('should return cached tiles from getTiles after fetchTiles is called', async () => {
    const mockComponentTile = { id: 'component-1', name: 'Component', type: 'component' };
    const mockProcessorTile = { id: 'processor-1', name: 'Processor', type: 'processor' };
    const mockKameletTile = { id: 'kamelet-1', name: 'Kamelet', type: 'kamelet' };

    (camelComponentToTile as jest.Mock).mockReturnValue(mockComponentTile);
    (camelProcessorToTile as jest.Mock).mockReturnValue(mockProcessorTile);
    (kameletToTile as jest.Mock).mockReturnValue(mockKameletTile);

    const {
      result: { current: context },
    } = renderHook(() => useContext(CatalogTilesContext), {
      wrapper: ({ children }) => (
        <CatalogContext.Provider value={mockRegistry}>
          <CatalogTilesProvider>{children}</CatalogTilesProvider>
        </CatalogContext.Provider>
      ),
    });

    // Initially getTiles should return empty array
    let cachedTiles = context?.getTiles();
    expect(cachedTiles).toEqual([]);

    // After fetchTiles, getTiles should return the fetched tiles
    let fetchedTiles: ITile[] | undefined;
    await act(async () => {
      fetchedTiles = await context?.fetchTiles();
    });

    cachedTiles = context?.getTiles();
    expect(cachedTiles).toEqual(fetchedTiles);
    expect(cachedTiles?.length).toBeGreaterThan(0);
  });

  it('should populate tiles upon loading', async () => {
    const componentCatalog = mockRegistry.getCatalog(CatalogKind.Component);
    const patternCatalog = mockRegistry.getCatalog(CatalogKind.Pattern);
    const entityCatalog = mockRegistry.getCatalog(CatalogKind.Entity);
    const kameletCatalog = mockRegistry.getCatalog(CatalogKind.Kamelet);

    const getAllSpyComponent = jest.spyOn(componentCatalog!, 'getAll');
    const getAllSpyPattern = jest.spyOn(patternCatalog!, 'getAll');
    const getAllSpyEntity = jest.spyOn(entityCatalog!, 'getAll');
    const getAllSpyKamelet = jest.spyOn(kameletCatalog!, 'getAll');

    render(
      <CatalogContext.Provider value={mockRegistry}>
        <CatalogTilesProvider />
      </CatalogContext.Provider>,
    );

    await waitFor(() => {
      expect(getAllSpyComponent).toHaveBeenCalled();
      expect(getAllSpyPattern).toHaveBeenCalled();
      expect(getAllSpyEntity).toHaveBeenCalled();
      expect(getAllSpyKamelet).toHaveBeenCalledWith({ forceFresh: true });
    });
  });
});
