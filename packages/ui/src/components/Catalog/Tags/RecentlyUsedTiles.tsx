import { LabelGroup } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { ITile } from '../Catalog.models';
import { CatalogClickableLabel } from './CatalogClickableLabel';

interface RecentlyUsedTilesProps {
  recentTiles: ITile[];
  onTileClick: (tile: ITile) => void;
}

export const RecentlyUsedTiles: FunctionComponent<RecentlyUsedTilesProps> = ({ recentTiles, onTileClick }) => {
  if (recentTiles.length === 0) {
    return null;
  }

  return (
    <LabelGroup
      isCompact
      className="category-bar recently-used-bar"
      categoryName="Recently used"
      numLabels={recentTiles.length}
    >
      {recentTiles.map((tile) => (
        <CatalogClickableLabel
          key={`${tile.type}-${tile.name}`}
          color="blue"
          variant="outline"
          buttonClassName="recently-used-bar__label"
          data-testid={`recently-used-tile-${tile.name}`}
          onClick={() => {
            onTileClick(tile);
          }}
          icon={<img src={tile.iconUrl} alt="" width={16} height={16} />}
        >
          {tile.title}
        </CatalogClickableLabel>
      ))}
    </LabelGroup>
  );
};
