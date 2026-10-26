import './DataListItem.scss';

import { DataListCell, DataListItem, DataListItemCells, DataListItemRow, Grid, GridItem } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, memo, useCallback } from 'react';

import { getTileKey, ITile } from './Catalog.models';
import { CatalogTagsPanel } from './Tags';
import { TileHeaderTags, TileIcon, TileProvider } from './TileParts';

interface ICatalogDataListItemProps {
  tile: ITile;
  onClick: (tile: ITile) => void;
  onTagClick: (_event: unknown, value: string) => void;
}

const titleElementOrder = {
  default: '1',
};

const tagsElementOrder = {
  default: '3',
  md: '2',
};

const descriptionElementOrder = {
  default: '2',
  md: '3',
};

const providerElementOrder = {
  default: '4',
  md: '4',
};

export const CatalogDataListItem: FunctionComponent<ICatalogDataListItemProps> = memo(
  ({ tile, onClick, onTagClick }) => {
    const tileKey = getTileKey(tile);

    const onItemClick = useCallback(() => {
      onClick(tile);
    }, [onClick, tile]);

    const onItemKeyDown = useCallback(
      (event: KeyboardEvent<HTMLLIElement>) => {
        /* Ignore keys coming from nested controls, e.g. the tag buttons */
        if (event.target !== event.currentTarget) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(tile);
        }
      },
      [onClick, tile],
    );

    return (
      <DataListItem
        aria-labelledby={`${tileKey}-title`}
        id={tileKey}
        data-testid={'tile-' + tile.name}
        className="catalog-data-list-item pf-m-clickable"
        tabIndex={0}
        onClick={onItemClick}
        onKeyDown={onItemKeyDown}
      >
        <DataListItemRow>
          <DataListItemCells
            dataListCells={[
              <DataListCell key="List item">
                <Grid>
                  <GridItem sm={12} md={6} order={titleElementOrder}>
                    <div className="catalog-data-list-item__title-div-left">
                      <TileIcon tile={tile} className="catalog-data-list-item__title-div-left__icon" />
                      <span id={`${tileKey}-title`} className="catalog-data-list-item__title-div-left__title">
                        {tile.title}
                      </span>
                      <TileHeaderTags
                        tile={tile}
                        aria-label="data-list-item-headers-tags"
                        tagClassName="catalog-data-list-item__tags"
                        showVersion
                      />
                    </div>
                  </GridItem>
                  <GridItem sm={12} md={6} order={tagsElementOrder}>
                    <div className="catalog-data-list-item__title-div-right">
                      <CatalogTagsPanel tags={tile.tags} onTagClick={onTagClick} />
                    </div>
                  </GridItem>
                  <GridItem sm={12} md={11} order={descriptionElementOrder}>
                    <span className="catalog-data-list-item__description">{tile.description}</span>
                  </GridItem>
                  <GridItem sm={12} md={1} order={providerElementOrder}>
                    <TileProvider provider={tile.provider} className="catalog-data-list-item__provider" />
                  </GridItem>
                </Grid>
              </DataListCell>,
            ]}
          />
        </DataListItemRow>
      </DataListItem>
    );
  },
);
CatalogDataListItem.displayName = 'CatalogDataListItem';
