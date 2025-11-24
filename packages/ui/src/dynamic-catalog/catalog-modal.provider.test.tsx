import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';

import { ITile } from '../components/Catalog';
import { CatalogKind, DefinedComponent } from '../models';
import { CatalogContext } from './catalog.provider';
import { CatalogModalContext, CatalogModalProvider } from './catalog-modal.provider';
import { CatalogTilesContext } from './catalog-tiles.provider';
import { IDynamicCatalogRegistry } from './models';

describe('CatalogModalProvider', () => {
  const mockTiles: ITile[] = [
    { name: 'amqp', type: 'component', title: 'AMQP', tags: ['messaging'] },
    { name: 'log', type: 'processor', title: 'Logger', tags: ['eip', 'routing'] },
    { name: 'route', type: 'entity', title: 'Route', tags: ['configuration'] },
    { name: 'sink', type: 'kamelet', title: 'Kamelet Sink', tags: ['sink'] },
  ];

  const mockCatalogRegistry: IDynamicCatalogRegistry = {
    getEntity: jest.fn(),
    getCatalog: jest.fn(),
    setCatalog: jest.fn(),
    clearRegistry: jest.fn(),
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
    jest.clearAllMocks();
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
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      let componentPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal to resolve promise
      act(() => {
        const closeButton = screen.getByLabelText('Close');
        closeButton.click();
      });

      const selectedComponent = await componentPromise!;
      expect(selectedComponent).toBeUndefined();
    });

    it('should return all tiles when no filter is provided', async () => {
      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      act(() => {
        result.current!.getNewComponent();
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
      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      act(() => {
        result.current!.getNewComponent((tile: ITile) => tile.type === CatalogKind.Component);
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
      (mockCatalogRegistry.getEntity as jest.Mock).mockResolvedValue(mockDefinition);

      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      let componentPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-amqp')).toBeInTheDocument();
      });

      // Click on a tile
      const amqpTile = screen.getByTestId('tile-header-amqp');
      fireEvent.click(amqpTile);

      const selectedComponent = await componentPromise!;

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
      (mockCatalogRegistry.getEntity as jest.Mock).mockResolvedValue(mockDefinition);

      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      let componentPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-sink')).toBeInTheDocument();
      });

      const kameletTile = screen.getByTestId('tile-header-sink');
      fireEvent.click(kameletTile);

      await componentPromise!;

      expect(mockCatalogRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'sink', {
        forceFresh: true,
      });
    });

    it('should resolve with undefined when modal is closed without selection', async () => {
      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      let componentPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByText('Catalog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      const selectedComponent = await componentPromise!;
      expect(selectedComponent).toBeUndefined();
    });

    it('should handle fetchTiles error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fetchTilesError = () => Promise.reject(new Error('Failed to fetch tiles'));

      const wrapper = createWrapper(fetchTilesError);
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders(fetchTilesError);

      act(() => {
        result.current!.getNewComponent();
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
      (mockCatalogRegistry.getEntity as jest.Mock)
        .mockResolvedValueOnce(mockDefinition1)
        .mockResolvedValueOnce(mockDefinition2);

      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      // First call
      let firstPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        firstPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-amqp')).toBeInTheDocument();
      });

      const amqpTile = screen.getByTestId('tile-header-amqp');
      fireEvent.click(amqpTile);

      const firstComponent = await firstPromise!;
      expect(firstComponent?.name).toBe('amqp');

      // Second call
      let secondPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        secondPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByTestId('tile-header-log')).toBeInTheDocument();
      });

      const logTile = screen.getByTestId('tile-header-log');
      fireEvent.click(logTile);

      const secondComponent = await secondPromise!;
      expect(secondComponent?.name).toBe('log');
    });

    it('should filter by multiple criteria', async () => {
      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      act(() => {
        result.current!.getNewComponent(
          (tile: ITile) => tile.type === CatalogKind.Processor || tile.tags.includes('messaging'),
        );
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
      (mockCatalogRegistry.getEntity as jest.Mock).mockResolvedValue(mockDefinition);

      const wrapper = createWrapper();
      render(<div>Test</div>, { wrapper });

      const { result } = renderWithProviders();

      let componentPromise: Promise<DefinedComponent | undefined>;
      act(() => {
        componentPromise = result.current!.getNewComponent();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const amqpTile = screen.getByTestId('tile-header-amqp');
      fireEvent.click(amqpTile);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Promise should be resolved
      const selectedComponent = await componentPromise!;
      expect(selectedComponent).toBeDefined();
      expect(selectedComponent?.name).toBe('amqp');
    });
  });
});
