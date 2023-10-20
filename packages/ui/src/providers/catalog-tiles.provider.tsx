import { FunctionComponent, PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { ITile } from '../components/Catalog';
import { CatalogKind } from '../models';
import { CatalogContext } from './catalog.provider';

export const CatalogTilesContext = createContext<ITile[]>([]);

/**
 * The goal for this provider is to receive the Tiles in a single place once, and then supply them to the Catalog instances,
 * since this could be an expensive operation, and we don't want to do it for every Catalog instance
 */
export const CatalogTilesProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const catalogService = useContext(CatalogContext);

  const tiles = useMemo(() => {
    const combinedTiles: ITile[] = [];

    Object.values(catalogService.getCatalogByKey(CatalogKind.Component) ?? {}).forEach((component) => {
      combinedTiles.push(camelComponentToTile(component));
    });
    Object.values(catalogService.getCatalogByKey(CatalogKind.Processor) ?? {}).forEach((processor) => {
      combinedTiles.push(camelProcessorToTile(processor));
    });
    Object.values(catalogService.getCatalogByKey(CatalogKind.Kamelet) ?? {}).forEach((kamelet) => {
      combinedTiles.push(kameletToTile(kamelet));
    });

    return combinedTiles;
  }, [catalogService]);

  return <CatalogTilesContext.Provider value={tiles}>{props.children}</CatalogTilesContext.Provider>;
};
