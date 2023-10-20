import { FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { BaseCatalog } from './BaseCatalog';
import { CatalogLayout, ITile } from './Catalog.models';
import './Catalog.scss';
import { CatalogFilter } from './CatalogFilter';

interface CatalogProps {
  /** Tiles list */
  tiles: ITile[];

  /** Callback being called when a Tile is clicked */
  onTileClick?: (tile: ITile) => void;
}

const checkThatArrayContainsAllTags = (arr: string[], tags: string[]) => tags.every((v) => arr.includes(v));

export const Catalog: FunctionComponent<PropsWithChildren<CatalogProps>> = (props) => {
  /** Set the tiles groups */
  const tilesGroups = useMemo(() => {
    return Array.from(new Set(props.tiles.map((tile) => tile.type)));
  }, [props.tiles]);

  /** Selected Group */
  const [activeGroup, setActiveGroup] = useState<string>(tilesGroups[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CatalogLayout, CatalogLayout.Gallery);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  /** Filter by selected group */
  const tilesFromGroup = useMemo(() => {
    return !activeGroup ? props.tiles : props.tiles.filter((tile) => activeGroup === tile.type);
  }, [activeGroup, props.tiles]);

  const filteredTiles = useMemo(() => {
    let toBeFiltered: ITile[] = [];
    // filter by selected tags
    toBeFiltered = filterTags
      ? tilesFromGroup.filter((tile) => {
          return checkThatArrayContainsAllTags(tile.tags, filterTags);
        })
      : tilesFromGroup;
    // filter by search term ( name, description, tag )
    toBeFiltered = searchTerm
      ? toBeFiltered?.filter((tile) => {
          return (
            tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tile.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tile.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        })
      : toBeFiltered;

    return toBeFiltered;
  }, [filterTags, searchTerm, tilesFromGroup]);

  const onFilterChange = useCallback((_event: unknown, value = '') => {
    setSearchTerm(value);
  }, []);

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
    <>
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
    </>
  );
};
