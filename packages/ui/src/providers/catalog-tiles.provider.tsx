import { FunctionComponent, PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { camelComponentToTile, camelEntityToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { ITile } from '../components/Catalog';
import { CatalogKind } from '../models';
import { CatalogContext } from './catalog.provider';
import { isDefined } from '../utils';

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
    /**
     * To build the Patterns catalog, we use the short list, as opposed of the CatalogKind.Processor which have all definitions
     * This is because the short list contains only the patterns that can be used within an integration.
     *
     * The full list of patterns is available in the CatalogKind.Processor catalog and it's being used as lookup for components properties.
     */
    Object.values(catalogService.getCatalogByKey(CatalogKind.Pattern) ?? {}).forEach((processor) => {
      combinedTiles.push(camelProcessorToTile(processor));
    });
    Object.values(catalogService.getCatalogByKey(CatalogKind.Entity) ?? {}).forEach((entity) => {
      /** KameletConfiguration and PipeConfiguration schemas are stored inside the entity catalog without model or properties */
      if (isDefined(entity.model)) {
        combinedTiles.push(camelEntityToTile(entity));
      }
    });
    Object.values(catalogService.getCatalogByKey(CatalogKind.Kamelet) ?? {}).forEach((kamelet) => {
      combinedTiles.push(kameletToTile(kamelet));
    });

    return combinedTiles;
  }, [catalogService]);

  return <CatalogTilesContext.Provider value={tiles}>{props.children}</CatalogTilesContext.Provider>;
};
