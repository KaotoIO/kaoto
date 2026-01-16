import { isDefined } from '@kaoto/forms';
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  camelComponentToTile,
  camelEntityToTile,
  camelProcessorToTile,
  citrusComponentToTile,
  kameletToTile,
} from '../camel-utils';
import { ITile } from '../components/Catalog';
import { CatalogKind } from '../models';
import { CatalogContext } from './catalog.provider';

export const CatalogTilesContext = createContext<
  | {
      /** Fetch and generate tiles from the DynamicCatalog */
      fetchTiles: () => Promise<ITile[]>;
      /** Return prefetched tiles. To use for synchronous methods */
      getTiles: () => ITile[];
    }
  | undefined
>(undefined);

/**
 * The goal for this provider is to receive the Tiles in a single place once, and then supply them to the Catalog instances,
 * since this could be an expensive operation, and we don't want to do it for every Catalog instance
 */
export const CatalogTilesProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const catalogRegistry = useContext(CatalogContext);
  const tilesRef = useRef<ITile[]>([]);

  const fetchTiles = useCallback(async () => {
    const [
      componentsCatalog,
      patternsCatalog,
      entitiesCatalog,
      kameletsCatalog,
      testActions,
      testContainers,
      testEndpoints,
    ] = await Promise.all([
      catalogRegistry.getCatalog(CatalogKind.Component)?.getAll(),
      catalogRegistry.getCatalog(CatalogKind.Pattern)?.getAll(),
      catalogRegistry.getCatalog(CatalogKind.Entity)?.getAll(),
      catalogRegistry.getCatalog(CatalogKind.Kamelet)?.getAll({ forceFresh: true }),
      catalogRegistry.getCatalog(CatalogKind.TestAction)?.getAll(),
      catalogRegistry.getCatalog(CatalogKind.TestContainer)?.getAll(),
      catalogRegistry.getCatalog(CatalogKind.TestEndpoint)?.getAll(),
    ]);

    const combinedTiles: ITile[] = [];
    Object.values(componentsCatalog ?? {}).forEach((component) => {
      combinedTiles.push(camelComponentToTile(component));
    });
    /**
     * To build the Patterns catalog, we use the short list, as opposed of the CatalogKind.Processor which have all definitions
     * This is because the short list contains only the patterns that can be used within an integration.
     *
     * The full list of patterns is available in the CatalogKind.Processor catalog and it's being used as lookup for components properties.
     */
    Object.values(patternsCatalog ?? {}).forEach((processor) => {
      combinedTiles.push(camelProcessorToTile(processor));
    });
    Object.values(entitiesCatalog ?? {}).forEach((entity) => {
      /** KameletConfiguration and PipeConfiguration schemas are stored inside the entity catalog without model or properties */
      if (isDefined(entity.model)) {
        combinedTiles.push(camelEntityToTile(entity));
      }
    });
    Object.values(kameletsCatalog ?? {}).forEach((kamelet) => {
      combinedTiles.push(kameletToTile(kamelet));
    });

    Object.values(testActions ?? {}).forEach((action) => {
      if (action.kind !== CatalogKind.TestActionGroup) {
        combinedTiles.push(citrusComponentToTile(action));
      }
    });
    Object.values(testContainers ?? {}).forEach((container) => {
      combinedTiles.push(citrusComponentToTile(container));
    });
    Object.values(testEndpoints ?? {}).forEach((endpoint) => {
      combinedTiles.push(citrusComponentToTile(endpoint));
    });

    tilesRef.current = combinedTiles;

    return combinedTiles;
  }, [catalogRegistry]);

  const getTiles = useCallback(() => tilesRef.current, []);

  useEffect(() => {
    fetchTiles();
  }, [fetchTiles]);

  const value = useMemo(
    () => ({
      fetchTiles,
      getTiles,
    }),
    [fetchTiles, getTiles],
  );

  return <CatalogTilesContext.Provider value={value}>{props.children}</CatalogTilesContext.Provider>;
};
