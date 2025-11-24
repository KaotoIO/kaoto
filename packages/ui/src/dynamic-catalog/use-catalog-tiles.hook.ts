import { useContext } from 'react';

import { CatalogTilesContext } from './catalog-tiles.provider';

export const useCatalogTiles = () => {
  const catalogTilesContext = useContext(CatalogTilesContext);

  if (catalogTilesContext === undefined) {
    throw new Error('useCatalogTiles must be used within a <CatalogProvider>');
  }

  return catalogTilesContext;
};
