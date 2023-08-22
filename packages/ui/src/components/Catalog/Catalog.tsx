import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { BaseCatalog } from './BaseCatalog';
import './Catalog.scss';
import { CatalogFilter } from './CatalogFilter';
import { ITile } from './Tile.models';

interface CatalogProps {
  tiles: Record<string, ITile[]>;
  onTileClick?: (tile: ITile) => void;
}

export const Catalog: FunctionComponent<PropsWithChildren<CatalogProps>> = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>(getFirstActiveGroup(props.tiles));
  const [filteredTiles, setFilteredTiles] = useState<ITile[]>([]);

  useEffect(() => {
    setGroups(Object.keys(props.tiles));
    setActiveGroup(getFirstActiveGroup(props.tiles));
  }, [props.tiles]);

  useEffect(() => {
    setFilteredTiles(
      props.tiles[activeGroup]?.filter((tile) => {
        return (
          tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tile.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tile.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }),
    );
  }, [searchTerm, activeGroup, props.tiles]);

  const onChange = useCallback((_event: unknown, value = '') => {
    setSearchTerm(value);
  }, []);

  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  return (
    <>
      <CatalogFilter
        className="catalog__filter"
        searchTerm={searchTerm}
        groups={groups}
        activeGroup={activeGroup}
        onChange={onChange}
        setActiveGroup={setActiveGroup}
      />

      <BaseCatalog tiles={filteredTiles} onTileClick={onTileClick} />
    </>
  );
};

function getFirstActiveGroup(tiles: CatalogProps['tiles']): string {
  return Object.keys(tiles)[0];
}
