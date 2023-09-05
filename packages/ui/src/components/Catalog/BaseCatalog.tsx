import { Gallery, Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { Tile } from './Tile';
import { ITile } from './Tile.models';

interface BaseCatalogProps {
  className?: string;
  tiles: ITile[];
  onTileClick?: (tile: ITile) => void;
}

export const BaseCatalog: FunctionComponent<BaseCatalogProps> = (props) => {
  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  return (
    <div className={props.className}>
      <Title headingLevel="h2" size="xl">
        Showing {props.tiles?.length} elements
      </Title>

      <Gallery hasGutter>
        {props.tiles?.map((tile) => <Tile key={tile.name} tile={tile} onClick={onTileClick} />)}
      </Gallery>
    </div>
  );
};
