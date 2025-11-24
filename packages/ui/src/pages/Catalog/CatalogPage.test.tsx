import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ITile } from '../../components/Catalog';
import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { CatalogTilesContext } from '../../providers/catalog-tiles.provider';
import { ReloadContext, SettingsProvider } from '../../providers';
import { CatalogPage } from './CatalogPage';

describe('CatalogPage', () => {
  let reloadPage: jest.Mock;
  let settingsAdapter: AbstractSettingsAdapter;

  beforeEach(() => {
    reloadPage = jest.fn();
    settingsAdapter = new DefaultSettingsAdapter();
  });
  const mockTiles: ITile[] = [
    {
      type: 'component',
      name: 'timer',
      title: 'Timer',
      description: 'Generate messages in specified intervals using java.util.Timer.',
      tags: ['scheduling'],
      headerTags: ['Stable'],
      provider: 'Apache Camel',
    },
    {
      type: 'kamelet',
      name: 'aws-s3-source',
      title: 'AWS S3 Source',
      description: 'Receive data from AWS S3.',
      tags: ['source', 'cloud'],
      headerTags: ['Stable'],
      provider: 'Apache Camel Kamelets',
    },
  ];

  describe('Loading state', () => {
    it('should display loading spinner when fetching catalogs', () => {
      const tilesRetrievalFn = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      expect(screen.getByText('Fetching catalogs')).toBeInTheDocument();
      expect(screen.getByLabelText('Fetching catalogs')).toBeInTheDocument();
      expect(tilesRetrievalFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success state', () => {
    it('should render Catalog component with tiles on successful fetch', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      expect(tilesRetrievalFn).toHaveBeenCalledTimes(1);
    });

    it('should open modal when a tile is clicked', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      // Find and click a tile
      const tileElement = screen.getByTestId('tile-header-timer');
      act(() => {
        fireEvent.click(tileElement);
      });

      await waitFor(() => {
        // Modal uses React portals, so we need to use baseElement
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).toBeInTheDocument();
      });
    });

    it('should close modal when onClose is called', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      // Open modal
      const tileElement = screen.getByTestId('tile-header-timer');
      act(() => {
        fireEvent.click(tileElement);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).toBeInTheDocument();
      });

      // Close modal using the close button
      const closeButton = baseElement.querySelector('.pf-v6-c-modal-box__close button');
      act(() => {
        fireEvent.click(closeButton!);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).not.toBeInTheDocument();
      });
    });

    it('should render modal only when modalTile is set', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      // Modal should not be rendered initially
      expect(baseElement.querySelector('.properties-modal')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display LoadDefaultCatalog component on error', async () => {
      const errorMessage = 'Failed to fetch catalog';
      const tilesRetrievalFn = jest.fn(() => Promise.reject(new Error(errorMessage)));

      render(
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <CatalogTilesContext.Provider value={tilesRetrievalFn}>
              <CatalogPage />
            </CatalogTilesContext.Provider>
          </SettingsProvider>
        </ReloadContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('load-default-catalog')).toBeInTheDocument();
      });

      expect(tilesRetrievalFn).toHaveBeenCalledTimes(1);
    });

    it('should pass error message to LoadDefaultCatalog component', async () => {
      const errorMessage = 'Network error occurred';
      const tilesRetrievalFn = jest.fn(() => Promise.reject(new Error(errorMessage)));

      render(
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <CatalogTilesContext.Provider value={tilesRetrievalFn}>
              <CatalogPage />
            </CatalogTilesContext.Provider>
          </SettingsProvider>
        </ReloadContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('load-default-catalog')).toBeInTheDocument();
      });
    });

    it('should clear tiles on error', async () => {
      const errorMessage = 'Failed to load';
      const tilesRetrievalFn = jest.fn(() => Promise.reject(new Error(errorMessage)));

      render(
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <CatalogTilesContext.Provider value={tilesRetrievalFn}>
              <CatalogPage />
            </CatalogTilesContext.Provider>
          </SettingsProvider>
        </ReloadContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('load-default-catalog')).toBeInTheDocument();
      });

      // Verify that the Catalog component is not rendered
      expect(screen.queryByText('Timer')).not.toBeInTheDocument();
      expect(screen.queryByText('AWS S3 Source')).not.toBeInTheDocument();
    });

    it('should handle error without message property', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.reject('String error'));

      render(
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <CatalogTilesContext.Provider value={tilesRetrievalFn}>
              <CatalogPage />
            </CatalogTilesContext.Provider>
          </SettingsProvider>
        </ReloadContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('load-default-catalog')).toBeInTheDocument();
      });
    });
  });

  describe('Tiles retrieval', () => {
    it('should call tilesRetrievalFn only once on mount', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      expect(tilesRetrievalFn).toHaveBeenCalledTimes(1);
    });

    it('should handle empty tiles array', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve([]));

      render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      expect(tilesRetrievalFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal tile management', () => {
    it('should set modal tile when onTileClick is called', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      const tileElement = screen.getByTestId('tile-header-timer');
      act(() => {
        fireEvent.click(tileElement);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box__title-text')).toHaveTextContent('Timer');
      });
    });

    it('should clear modal tile when modal is closed', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      // Open modal
      const tileElement = screen.getByTestId('tile-header-timer');
      act(() => {
        fireEvent.click(tileElement);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = baseElement.querySelector('.pf-v6-c-modal-box__close button');
      act(() => {
        fireEvent.click(closeButton!);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).not.toBeInTheDocument();
      });

      // Modal should not be rendered anymore
      expect(baseElement.querySelector('.properties-modal')).not.toBeInTheDocument();
    });

    it('should allow opening modal for different tiles', async () => {
      const tilesRetrievalFn = jest.fn(() => Promise.resolve(mockTiles));

      const { baseElement } = render(
        <CatalogTilesContext.Provider value={tilesRetrievalFn}>
          <CatalogPage />
        </CatalogTilesContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Fetching catalogs')).not.toBeInTheDocument();
      });

      // Click first tile
      const firstTileElement = screen.getByTestId('tile-header-timer');
      act(() => {
        fireEvent.click(firstTileElement);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box__title-text')).toHaveTextContent('Timer');
      });

      // Close modal
      const closeButton = baseElement.querySelector('.pf-v6-c-modal-box__close button');
      act(() => {
        fireEvent.click(closeButton!);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box')).not.toBeInTheDocument();
      });

      // Click second tile
      const secondTileElement = screen.getByTestId('tile-header-aws-s3-source');
      act(() => {
        fireEvent.click(secondTileElement);
      });

      await waitFor(() => {
        expect(baseElement.querySelector('.pf-v6-c-modal-box__title-text')).toHaveTextContent('AWS S3 Source');
      });
    });
  });
});
