import { FunctionComponent, PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { ITile } from '../components/Catalog';
import { CatalogKind } from '../models';
import { CatalogContext } from './catalog.provider';

export const CatalogTilesContext = createContext<Record<string, ITile[]>>({});

/**
 * The goal for this provider is to receive the Tiles in a single place once, and then supply them to the Catalog instances,
 * since this could be an expensive operation, and we don't want to do it for every Catalog instance
 */
export const CatalogTilesProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const catalogService = useContext(CatalogContext);
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});

  useEffect(() => {
    setTiles({
      Component: Object.values(catalogService.getCatalogByKey(CatalogKind.Component) ?? {}).map(camelComponentToTile),
      Processor: Object.values(catalogService.getCatalogByKey(CatalogKind.Processor) ?? {}).map(camelProcessorToTile),
      Kamelet: Object.values(catalogService.getCatalogByKey(CatalogKind.Kamelet) ?? {}).map(kameletToTile),
    });
  }, [catalogService]);

  return <CatalogTilesContext.Provider value={tiles}>{props.children}</CatalogTilesContext.Provider>;
};
