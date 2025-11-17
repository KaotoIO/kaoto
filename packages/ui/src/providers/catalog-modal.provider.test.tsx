import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';

import { ITile } from '../components/Catalog';
import { CatalogKind } from '../models/catalog-kind';
import { CatalogModalContext, CatalogModalProvider } from './catalog-modal.provider';
import { CatalogTilesContext } from './catalog-tiles.provider';

describe('CatalogModalProvider', () => {
  const mockTiles: ITile[] = [
    { name: 'amqp', type: 'component', title: 'AMQP', tags: ['messaging'] },
    { name: 'log', type: 'processor', title: 'Logger', tags: ['eip', 'routing'] },
    { name: 'route', type: 'entity', title: 'Route', tags: ['configuration'] },
    { name: 'sink', type: 'kamelet', title: 'Kamelet Sink', tags: ['sink'] },
  ];

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <CatalogTilesContext.Provider value={mockTiles}>
      <CatalogModalProvider>{children}</CatalogModalProvider>
    </CatalogTilesContext.Provider>
  );

  const renderWithProviders = () => {
    return renderHook(() => useContext(CatalogModalContext), { wrapper });
  };

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
});
