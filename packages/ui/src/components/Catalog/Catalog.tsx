import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { BaseCatalog } from './BaseCatalog';
import { CatalogLayout, ITile } from './Catalog.models';
import './Catalog.scss';
import { CatalogFilter } from './CatalogFilter';

interface CatalogProps {
  tiles: Record<string, ITile[]>;
  onTileClick?: (tile: ITile) => void;
}

const checkThatArrayContainsAllTags = (arr: string[], tags: string[]) => tags.every((v) => arr.includes(v));

export const Catalog: FunctionComponent<PropsWithChildren<CatalogProps>> = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>(getFirstActiveGroup(props.tiles));
  const [activeLayout, setActiveLayout] = useState(CatalogLayout.Gallery);
  const [filteredTiles, setFilteredTiles] = useState<ITile[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => {
    setGroups(Object.keys(props.tiles));
    setActiveGroup(getFirstActiveGroup(props.tiles));
  }, [props.tiles]);

  useEffect(() => {
    let toBeFiltered: ITile[] = [];
    // filter by selected tags
    toBeFiltered = filterTags
      ? props.tiles[activeGroup]?.filter((tile) => {
          return checkThatArrayContainsAllTags(tile.tags, filterTags);
        })
      : props.tiles[activeGroup];
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
    setFilteredTiles(toBeFiltered);
  }, [searchTerm, activeGroup, props.tiles, filterTags]);

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
        groups={groups}
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

function getFirstActiveGroup(tiles: CatalogProps['tiles']): string {
  return Object.keys(tiles)[0];
}
