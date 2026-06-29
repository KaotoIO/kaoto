import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import type { Mock } from 'vitest';

import { ITile } from '../components/Catalog';
import { CatalogKind, DefinedComponent } from '../models';
import { CatalogContext } from './catalog.provider';
import { CatalogModalContext, CatalogModalProvider } from './catalog-modal.provider';
import { CatalogTilesContext } from './catalog-tiles.provider';
import { IDynamicCatalogRegistry } from './models';

describe('CatalogModalProvider', () => {
  const mockTiles: ITile[] = [
    { name: 'amqp', type: 'component', title: 'AMQP', tags: ['messaging'], iconUrl: 'test-icon-url' },
    { name: 'log', type: 'processor', title: 'Logger', tags: ['eip', 'routing'], iconUrl: 'test-icon-url' },
    { name: 'route', type: 'entity', title: 'Route', tags: ['configuration'], iconUrl: 'test-icon-url' },
    { name: 'sink', type: 'kamelet', title: 'Kamelet Sink', tags: ['sink'], iconUrl: 'test-icon-url' },
  ];

  const mockCatalogRegistry: IDynamicCatalogRegistry = {
    getEntity: vi.fn(),
    getCatalog: vi.fn(),
    setCatalog: vi.fn(),
    clearRegistry: vi.fn(),
  };

  const createWrapper = (
    fetchTiles: () => Promise<ITile[]> = () => Promise.resolve(mockTiles),
    getTiles: () => ITile[] = () => mockTiles,
  ): FunctionComponent<PropsWithChildren> => {
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <CatalogContext.Provider value={mockCatalogRegistry}>
        <CatalogTilesContext.Provider value={{ fetchTiles, getTiles }}>
          <CatalogModalProvider>{children}</CatalogModalProvider>
        </CatalogTilesContext.Provider>
      </CatalogContext.Provider>
    );
    return wrapper;
  };

  const renderWithProviders = (fetchTiles?: () => Promise<ITile[]>, getTiles?: () => ITile[]) => {
    const wrapper = createWrapper(fetchTiles, getTiles);
    return renderHook(() => useContext(CatalogModalContext), { wrapper });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCompatibility', () => {
    it('should return true when the tile matches the catalog filter', () => {
      const { result } = renderWithProviders();

      const isCompatible = result.current?.checkCompatibility(
        'amqp',
        (tile: ITile) => tile.type === CatalogKind.Component,
      );
      expect(isCompatible).toBe(true);
    });

    it('should return false when the tile does not match the catalog filter', () => {
      const { result } = renderWithProviders();

      const isCompatible = result.current?.checkCompatibility(
        'sink',
        (tile: ITile) => tile.type === CatalogKind.Kamelet && tile.tags.includes('source') && tile.name !== 'source',
      );
      expect(isCompatible).toBe(false);
    });

    it('should return false when the tile does not exist', () => {
      const { result } = renderWithProviders();

      const isCompatible = result.current?.checkCompatibility('NonExistentTile', (_tile: ITile) => {
        return true;
      });
      expect(isCompatible).toBe(false);
    });

    it('should return false when no catalog filter is provided', () => {
      const { result } = renderWithProviders();

      const isCompatible = result.current?.checkCompatibility('log');
      expect(isCompatible).toBe(false);
    });
  });

  describe('getNewComponent', () => {
    it('should open modal and fetch tiles when getNewComponent is called', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(CatalogModalContext), { wrapper });

      let componentPromise: Promise<DefinedComponent | undefined>;
      await act(async () => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal to resolve promise
      await act(async () => {
        const closeButton = screen.getByLabelText('Close');
        closeButton.click();
      });

      const selectedComponent = await componentPromise!;
      expect(selectedComponent).toBeUndefined();
    });

    it('should return all tiles when no filter is provided', async () => {
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Check that all tiles are visible
      expect(screen.getByText('AMQP')).toBeInTheDocument();
      expect(screen.getByText('Logger')).toBeInTheDocument();
      expect(screen.getByText('Route')).toBeInTheDocument();
      expect(screen.getByText('Kamelet Sink')).toBeInTheDocument();
    });

    it('should filter tiles when catalogFilter is provided', async () => {
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              await getNewComponent((tile: ITile) => tile.type === CatalogKind.Component);
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Only component tiles should be visible
      expect(screen.getByText('AMQP')).toBeInTheDocument();
      expect(screen.queryByText('Logger')).not.toBeInTheDocument();
      expect(screen.queryByText('Route')).not.toBeInTheDocument();
      expect(screen.queryByText('Kamelet Sink')).not.toBeInTheDocument();
    });

    it('should resolve with selected component when tile is clicked', async () => {
      const mockDefinition = { component: { name: 'amqp' } };
      (mockCatalogRegistry.getEntity as Mock).mockResolvedValue(mockDefinition);

      let selectedComponent: DefinedComponent | undefined;
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              selectedComponent = await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-amqp')).toBeInTheDocument();
      });

      // Click on a tile
      const amqpTile = screen.getByTestId('tile-header-amqp');
      await act(async () => {
        fireEvent.click(amqpTile);
      });

      await waitFor(() => {
        expect(selectedComponent).toBeDefined();
      });

      expect(selectedComponent).toEqual({
        name: 'amqp',
        type: CatalogKind.Component,
        definition: mockDefinition,
      });

      expect(mockCatalogRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Component, 'amqp', {
        forceFresh: false,
      });
    });

    it('should call getEntity with forceFresh true for Kamelet tiles', async () => {
      const mockDefinition = { metadata: { name: 'sink' } };
      (mockCatalogRegistry.getEntity as Mock).mockResolvedValue(mockDefinition);

      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-sink')).toBeInTheDocument();
      });

      const kameletTile = screen.getByTestId('tile-header-sink');
      await act(async () => {
        fireEvent.click(kameletTile);
      });

      await waitFor(() => {
        expect(mockCatalogRegistry.getEntity).toHaveBeenCalled();
      });

      expect(mockCatalogRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'sink', {
        forceFresh: true,
      });
    });

    it('should resolve with undefined when modal is closed without selection', async () => {
      let selectedComponent: DefinedComponent | undefined = {
        name: 'test',
        type: CatalogKind.Component,
        definition: {},
      };
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              selectedComponent = await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText('Close');
      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(selectedComponent).toBeUndefined();
      });
    });

    it('should handle fetchTiles error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchTilesError = () => Promise.reject(new Error('Failed to fetch tiles'));

      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper(fetchTilesError);
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Should show empty catalog instead of crashing
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading catalog tiles', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should support multiple sequential getNewComponent calls', async () => {
      const mockDefinition1 = { component: { name: 'amqp' } };
      const mockDefinition2 = { processor: { name: 'log' } };
      (mockCatalogRegistry.getEntity as Mock)
        .mockResolvedValueOnce(mockDefinition1)
        .mockResolvedValueOnce(mockDefinition2);

      let firstComponent: DefinedComponent | undefined;
      let secondComponent: DefinedComponent | undefined;
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <>
            <button
              onClick={async () => {
                firstComponent = await getNewComponent();
              }}
            >
              Open First
            </button>
            <button
              onClick={async () => {
                secondComponent = await getNewComponent();
              }}
            >
              Open Second
            </button>
          </>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      // First call
      const firstButton = screen.getByText('Open First');
      fireEvent.click(firstButton);

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-amqp')).toBeInTheDocument();
      });

      const amqpTile = screen.getByTestId('tile-header-amqp');
      await act(async () => {
        fireEvent.click(amqpTile);
      });

      await waitFor(() => {
        expect(firstComponent).toBeDefined();
      });
      expect(firstComponent?.name).toBe('amqp');

      // Second call
      const secondButton = screen.getByText('Open Second');
      fireEvent.click(secondButton);

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-log')).toBeInTheDocument();
      });

      const logTile = screen.getByTestId('tile-header-log');
      await act(async () => {
        fireEvent.click(logTile);
      });

      await waitFor(() => {
        expect(secondComponent).toBeDefined();
      });
      expect(secondComponent?.name).toBe('log');
    });

    it('should filter by multiple criteria', async () => {
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              await getNewComponent(
                (tile: ITile) => tile.type === CatalogKind.Processor || tile.tags.includes('messaging'),
              );
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Should show AMQP (has messaging tag) and Logger (is processor)
      expect(screen.getByText('AMQP')).toBeInTheDocument();
      expect(screen.getByText('Logger')).toBeInTheDocument();
      // Should not show Route or Kamelet Sink
      expect(screen.queryByText('Route')).not.toBeInTheDocument();
      expect(screen.queryByText('Kamelet Sink')).not.toBeInTheDocument();
    });

    it('should close modal and resolve promise when component is selected', async () => {
      const mockDefinition = { component: { name: 'amqp' } };
      (mockCatalogRegistry.getEntity as Mock).mockResolvedValue(mockDefinition);

      let selectedComponent: DefinedComponent | undefined;
      const TestComponent = () => {
        const { getNewComponent } = useContext(CatalogModalContext)!;
        return (
          <button
            onClick={async () => {
              selectedComponent = await getNewComponent();
            }}
          >
            Open Catalog
          </button>
        );
      };

      const wrapper = createWrapper();
      render(<TestComponent />, { wrapper });

      const button = screen.getByText('Open Catalog');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const amqpTile = screen.getByTestId('tile-header-amqp');
      await act(async () => {
        fireEvent.click(amqpTile);
      });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Promise should be resolved
      await waitFor(() => {
        expect(selectedComponent).toBeDefined();
      });
      expect(selectedComponent?.name).toBe('amqp');
    });
  });
});
