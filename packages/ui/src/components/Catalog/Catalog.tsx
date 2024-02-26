import { FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { BaseCatalog } from './BaseCatalog';
import { CatalogLayout, ITile } from './Catalog.models';
import './Catalog.scss';
import { CatalogFilter } from './CatalogFilter';
import { filterTiles } from './filter-tiles';

interface CatalogProps {
  /** Tiles list */
  tiles: ITile[];

  /** Callback being called when a Tile is clicked */
  onTileClick?: (tile: ITile) => void;
}

export const Catalog: FunctionComponent<PropsWithChildren<CatalogProps>> = (props) => {
  /** Selected Group */
  const [searchTerm, setSearchTerm] = useDebounceValue('', 500, { trailing: true });
  const [filterTags, setFilterTags] = useState<string[]>([]);

  /** Filter by selected group */
  const filteredTilesByGroup = useMemo(() => {
    return filterTiles(props.tiles, { searchTerm, searchTags: filterTags });
  }, [filterTags, props.tiles, searchTerm]);

  /** Set the tiles groups */
  const tilesGroups = useMemo(() => {
    return Object.entries(filteredTilesByGroup).map(([group, tiles]) => ({ name: group, count: tiles.length }));
  }, [filteredTilesByGroup]);

  const [activeGroup, setActiveGroup] = useState<string>(tilesGroups[0].name);
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CatalogLayout, CatalogLayout.Gallery);
  const filteredTiles = useMemo(() => filteredTilesByGroup[activeGroup] ?? [], [activeGroup, filteredTilesByGroup]);

  const onFilterChange = useCallback(
    (_event: unknown, value = '') => {
      setSearchTerm(value);
    },
    [setSearchTerm],
  );

  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  const onTagClick = useCallback((_event: unknown, value = '') => {
    setFilterTags((previousFilteredTags) => {
      return previousFilteredTags.includes(value) ? previousFilteredTags : [...previousFilteredTags, value];
    });
  }, []);

  return (
    <div className="catalog">
      <CatalogFilter
        className="catalog__filter"
        searchTerm={searchTerm}
        groups={tilesGroups}
        layouts={[CatalogLayout.Gallery, CatalogLayout.List]}
        activeGroup={activeGroup}
        activeLayout={activeLayout}
        filterTags={filterTags}
        onChange={onFilterChange}
        setActiveGroup={setActiveGroup}
        setActiveLayout={setActiveLayout}
        setFilterTags={setFilterTags}
      />
      <BaseCatalog
        className="catalog__base"
        tiles={filteredTiles}
        catalogLayout={activeLayout}
        onTileClick={onTileClick}
        onTagClick={onTagClick}
      />
    </div>
  );
};
