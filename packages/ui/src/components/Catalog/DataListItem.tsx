import {
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Grid,
  GridItem,
  LabelGroup,
} from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { IconResolver } from '../IconResolver';
import { ITile } from './Catalog.models';
import './DataListItem.scss';
import { CatalogTag, CatalogTagsPanel } from './Tags';

interface ICatalogDataListItemProps {
  tile: ITile;
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

export const CatalogDataListItem: FunctionComponent<ICatalogDataListItemProps> = (props) => {
  return (
    <DataListItem
      aria-labelledby={props.tile.name}
      key={props.tile.name}
      id={props.tile.name}
      className="catalog-data-list-item"
    >
      <DataListItemRow>
        <DataListItemCells
          dataListCells={[
            <DataListCell key="List item">
              <Grid>
                <GridItem sm={12} md={6} order={titleElementOrder}>
                  <div className="catalog-data-list-item__title-div-left">
                    <IconResolver className="catalog-data-list-item__title-div-left__icon" tile={props.tile} />
                    <span id="clickable-action-item1" className="catalog-data-list-item__title-div-left__title">
                      {props.tile.title}
                    </span>
                    <LabelGroup isCompact aria-label="data-list-item-headers-tags">
                      {props.tile.headerTags?.map((tag, index) => (
                        <CatalogTag
                          key={`${props.tile.name}-${tag}-${index}`}
                          tag={tag}
                          className="catalog-data-list-item__tags"
                        />
                      ))}
                      {props.tile.version && (
                        <CatalogTag
                          key={`${props.tile.version}`}
                          tag={props.tile.version}
                          className="catalog-data-list-item__tags"
                          variant="outline"
                        />
                      )}
                    </LabelGroup>
                  </div>
                </GridItem>
                <GridItem sm={12} md={6} order={tagsElementOrder}>
                  <div className="catalog-data-list-item__title-div-right">
                    <CatalogTagsPanel tags={props.tile.tags} onTagClick={props.onTagClick} />
                  </div>
                </GridItem>
                <GridItem span={12} order={descriptionElementOrder}>
                  <span className="catalog-data-list-item__description">{props.tile.description}</span>
                </GridItem>
              </Grid>
            </DataListCell>,
          ]}
        />
      </DataListItemRow>
    </DataListItem>
  );
};
