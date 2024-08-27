import { DataList, Gallery, Pagination } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import './BaseCatalog.scss';
import { CatalogLayout, ITile } from './Catalog.models';
import { CatalogDataListItem } from './DataListItem';
import { Tile } from './Tile';

interface BaseCatalogProps {
  className?: string;
  tiles: ITile[];
  catalogLayout: CatalogLayout;
  onTileClick?: (tile: ITile) => void;
  onTagClick: (_event: unknown, value: string) => void;
}

export const BaseCatalog: FunctionComponent<BaseCatalogProps> = (props) => {
  const catalogBodyRef = useRef<HTMLDivElement>(null);
  const itemCount = props.tiles?.length;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  const startIndex = (page - 1) * perPage < 0 ? 0 : (page - 1) * perPage;
  const endIndex = page * perPage;
  useEffect(() => {
    // Handling the scenario where the item count is less the page selected.
    if (startIndex + 1 > itemCount) {
      setPage(Math.ceil(itemCount / perPage));
    } else if (page === 0 && itemCount > 0) setPage(1);

    catalogBodyRef.current!.scrollTop = 0;
  }, [props.tiles]);

  const onSelectDataListItem = useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent, id: string) => {
      const tile = props.tiles.find((tile) => tile.name + '-' + tile.type === id);
      onTileClick(tile!);
    },
    [onTileClick, props.tiles],
  );

  const onSetPage = (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => {
    setPage(newPage);
  };

  const onPerPageSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPerPage: number,
    newPage: number,
  ) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const paginatedCards = props.tiles?.slice(startIndex, endIndex);

  return (
    <>
      <Pagination
        itemCount={itemCount}
        perPage={perPage}
        page={page}
        onSetPage={onSetPage}
        widgetId="catalog-pagination"
        onPerPageSelect={onPerPageSelect}
        ouiaId="CatalogPagination"
      />
      <div id="catalog-list" className="catalog-list" ref={catalogBodyRef}>
        {props.catalogLayout == CatalogLayout.List && (
          <DataList aria-label="Catalog list" onSelectDataListItem={onSelectDataListItem} isCompact>
            {paginatedCards.map((tile) => (
              <CatalogDataListItem key={`${tile.name}-${tile.type}`} tile={tile} onTagClick={props.onTagClick} />
            ))}
          </DataList>
        )}
        {props.catalogLayout == CatalogLayout.Gallery && (
          <Gallery hasGutter>
            {paginatedCards.map((tile) => (
              <Tile key={`${tile.name}-${tile.type}`} tile={tile} onClick={onTileClick} onTagClick={props.onTagClick} />
            ))}
          </Gallery>
        )}
      </div>
    </>
  );
};
