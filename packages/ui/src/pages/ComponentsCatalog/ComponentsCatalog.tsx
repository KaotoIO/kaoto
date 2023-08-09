import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../../camel-utils';
import { Catalog, ITile } from '../../components/Catalog';
import { CatalogKind } from '../../models';
import { useComponentsCatalogStore } from '../../store';

export const ComponentsCatalog: FunctionComponent = () => {
  const { catalogs } = useComponentsCatalogStore((state) => state);
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});

  useEffect(() => {
    setTiles({
      Component: Object.values(catalogs[CatalogKind.Component] ?? {}).map(camelComponentToTile),
      Processor: Object.values(catalogs[CatalogKind.Processor] ?? {}).map(camelProcessorToTile),
      Kamelet: Object.values(catalogs[CatalogKind.Kamelet] ?? {}).map(kameletToTile),
    });
  }, [catalogs]);

  const onTileClick = useCallback((tile: ITile) => {
    console.log('tile clicked', tile);
  }, []);

  return (
    <>
      <p>ComponentsCatalog Page</p>
      <Catalog tiles={tiles} onTileClick={onTileClick} />
    </>
  );
};
