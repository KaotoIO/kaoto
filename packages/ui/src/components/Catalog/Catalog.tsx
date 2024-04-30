import { FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { BaseCatalog } from './BaseCatalog';
import { CatalogLayout, ITile } from './Catalog.models';
import './Catalog.scss';
import { CatalogFilter } from './CatalogFilter';
import { filterTiles } from './filter-tiles';
import { sortTags } from './sort-tags';

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

  /** All tags, sorted to have selected and prioritized tags first */
  const { sortedTags, overflowIndex } = useMemo(() => {
    return sortTags(props.tiles, filterTags);
  }, [filterTags, props.tiles]);

  /** Filter by selected group */
  const filteredTilesByGroup = useMemo(() => {
    return filterTiles(props.tiles, { searchTerm, searchTags: filterTags });
  }, [filterTags, props.tiles, searchTerm]);

  /** Set the tiles groups */
  const tilesGroups = useMemo(() => {
    return Object.entries(filteredTilesByGroup).map(([group, tiles]) => ({ name: group, count: tiles.length }));
  }, [filteredTilesByGroup]);

  const [activeGroups, setActiveGroups] = useState<string[]>(tilesGroups.map((g) => g.name));
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CatalogLayout, CatalogLayout.Gallery);
  const filteredTiles = useMemo(() => {
    return Object.entries(filteredTilesByGroup).reduce((acc, [group, tiles]) => {
      if (activeGroups.includes(group)) {
        acc.push(...tiles);
      }
      return acc;
    }, [] as ITile[]);
  }, [activeGroups, filteredTilesByGroup]);

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
        tags={sortedTags}
        tagsOverflowIndex={overflowIndex}
        layouts={[CatalogLayout.Gallery, CatalogLayout.List]}
        activeGroups={activeGroups}
        activeLayout={activeLayout}
        filterTags={filterTags}
        onChange={onFilterChange}
        setActiveGroups={setActiveGroups}
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
