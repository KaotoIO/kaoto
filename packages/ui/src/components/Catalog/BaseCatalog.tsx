import { DataList, Gallery, Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { CatalogLayout, ITile } from './Catalog.models';
import { CatalogDataListItem } from './DataListItem';
import { Tile } from './Tile';

interface BaseCatalogProps {
  className?: string;
  tiles: ITile[];
  catalogLayout: CatalogLayout;
  onTileClick?: (tile: ITile) => void;
}

export const BaseCatalog: FunctionComponent<BaseCatalogProps> = (props) => {
  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  const onSelectDataListItem = useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent, id: string) => {
      const tile = props.tiles.find((tile) => tile.name === id);
      onTileClick(tile!);
    },
    [props],
  );

  return (
    <div className={props.className}>
      <Title headingLevel="h2" size="xl">
        Showing {props.tiles?.length} elements
      </Title>
      {props.catalogLayout == CatalogLayout.List && (
        <DataList aria-label="Catalog list" onSelectDataListItem={onSelectDataListItem} isCompact>
          {props.tiles?.map((tile) => <CatalogDataListItem key={tile.name} tile={tile} />)}
        </DataList>
      )}
      {props.catalogLayout == CatalogLayout.Gallery && (
        <Gallery hasGutter>
          {props.tiles?.map((tile) => <Tile key={tile.name} tile={tile} onClick={onTileClick} />)}
        </Gallery>
      )}
    </div>
  );
};
