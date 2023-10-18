import { FunctionComponent, PropsWithChildren, createContext } from 'react';
import { ITile } from '../components/Catalog';

export const CatalogTilesContext = createContext<Record<string, ITile[]>>({});

interface CatalogTilesProviderProps {
  tiles: Record<string, ITile[]>;
}

/**
 * The goal for this provider is to receive the Tiles in a single place once, and then supply them to the Catalog instances,
 * since this could be an expensive operation, and we don't want to do it for every Catalog instance
 */
export const CatalogTilesProvider: FunctionComponent<PropsWithChildren<CatalogTilesProviderProps>> = (props) => {
  return <CatalogTilesContext.Provider value={props.tiles}>{props.children}</CatalogTilesContext.Provider>;
};
