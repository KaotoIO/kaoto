import './Tile.scss';

import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, memo, useCallback } from 'react';

import { getTileKey, ITile } from './Catalog.models';
import { CatalogTag, CatalogTagsPanel } from './Tags';
import { TileHeaderTags, TileIcon, TileProvider } from './TileParts';

interface TileProps {
  tile: ITile;
  onClick: (tile: ITile) => void;
  onTagClick: (_event: unknown, value: string) => void;
}

export const Tile: FunctionComponent<TileProps> = memo(({ tile, onClick, onTagClick }) => {
  const tileKey = getTileKey(tile);
  const onTileClick = useCallback(() => {
    onClick(tile);
  }, [onClick, tile]);

  // The clickable overlay of the card covers the whole tile, so the native tooltip goes on the card itself
  const tooltip = tile.description ? `${tile.title}\n\n${tile.description}` : tile.title;

  return (
    <Card
      className="tile"
      data-testid={'tile-' + tile.name}
      isClickable
      isCompact
      role="button"
      id={tileKey}
      title={tooltip}
    >
      <CardHeader
        selectableActions={{ variant: 'single', selectableActionAriaLabelledby: `${tileKey}-title` }}
        data-testid={'tile-header-' + tile.name}
        onClick={onTileClick}
      >
        <div className="tile__header">
          <TileIcon tile={tile} className="tile__icon" />
          <TileHeaderTags tile={tile} aria-label="tile-headers-tags" />
        </div>

        <CardTitle className="tile__title">
          <span className="tile__title-text">{tile.title}</span>
          <span className="tile__name">({tile.name})</span>
          {tile.version && <CatalogTag tag={tile.version} variant="outline" />}
        </CardTitle>
      </CardHeader>

      <CardBody className="tile__body">
        <span className="tile__description">{tile.description}</span>
      </CardBody>

      <CardFooter>
        <CatalogTagsPanel tags={tile.tags} onTagClick={onTagClick} />
      </CardFooter>

      {tile.provider && <TileProvider provider={tile.provider} prefix="Provided by " />}
    </Card>
  );
});
Tile.displayName = 'Tile';
