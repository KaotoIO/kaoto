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
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CatalogLayout, CatalogLayout.Gallery);

  /** Selected Group */
  const [searchTerm, setSearchTerm] = useDebounceValue('', 500, { trailing: true });
  const [filterTags, setFilterTags] = useState<string[]>([]);

  /** All tags, sorted to have selected and prioritized tags first */
  const { sortedTags, overflowIndex } = useMemo(() => {
    return sortTags(props.tiles, filterTags);
  }, [filterTags, props.tiles]);

  /** All providers */
  const providers = useMemo(() => {
    const providersSet = new Set<string>();
    props.tiles.forEach((tile) => {
      providersSet.add(tile.provider ?? 'Community');
    });

    return Array.from(providersSet);
  }, [props.tiles]);

  /** Selected Providers */
  const [selectedProviders, setSelectedProviders] = useState<string[]>(providers);

  const filteredTiles = useMemo(() => {
    return filterTiles(props.tiles, { searchTerm, searchTags: filterTags, selectedProviders });
  }, [filterTags, props.tiles, searchTerm, selectedProviders]);

  /** Set the tiles groups */
  const tilesGroups = useMemo(() => {
    const groups: Record<string, ITile[]> = {};
    filteredTiles.forEach((tile) => {
      if (!groups[tile.type]) {
        groups[tile.type] = [];
      }
      groups[tile.type].push(tile);
    });
    return Object.entries(groups).map(([group, tiles]) => ({ name: group, count: tiles.length }));
  }, [filteredTiles]);

  const [activeGroups, setActiveGroups] = useState<string[]>(tilesGroups.map((g) => g.name));

  const filteredTilesByGroup = useMemo<ITile[]>(() => {
    return filteredTiles.filter((tile) => activeGroups.includes(tile.type));
  }, [activeGroups, filteredTiles]);

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

  const onSelectProvider = useCallback(
    (provider: string) => {
      setSelectedProviders(
        selectedProviders.includes(provider)
          ? selectedProviders.filter((selection) => selection !== provider)
          : [provider, ...selectedProviders],
      );
    },
    [selectedProviders],
  );

  return (
    <div className="catalog">
      <CatalogFilter
        className="catalog__filter"
        searchTerm={searchTerm}
        groups={tilesGroups}
        providers={providers}
        selectedProviders={selectedProviders}
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
        onSelectProvider={onSelectProvider}
      />
      <BaseCatalog
        className="catalog__base"
        tiles={filteredTilesByGroup}
        catalogLayout={activeLayout}
        onTileClick={onTileClick}
        onTagClick={onTagClick}
      />
    </div>
  );
};
