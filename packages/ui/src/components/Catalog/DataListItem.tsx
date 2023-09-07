import {
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Grid,
  GridItem,
  Label,
} from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { IconResolver } from '../IconResolver';
import { ITile } from './Catalog.models';
import './DataListItem.scss';
import { getTagColor } from './tag-color-resolver';

interface ICatalogDataListItemProps {
  tile: ITile;
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
                    {props.tile.headerTags?.map((tag, index) => (
                      <Label
                        key={`${props.tile.name}-${tag}-${index}`}
                        className="catalog-data-list-item__tags"
                        isCompact
                        color={getTagColor(tag)}
                      >
                        {tag}
                      </Label>
                    ))}
                    {props.tile.version && (
                      <Label
                        key={`${props.tile.version}`}
                        isCompact
                        className={'catalog-data-list-item__tags'}
                        variant="outline"
                      >
                        {props.tile.version}
                      </Label>
                    )}
                  </div>
                </GridItem>
                <GridItem sm={12} md={6} order={tagsElementOrder}>
                  <div className="catalog-data-list-item__title-div-right">
                    {props.tile.tags?.map((tag, index) => (
                      <Label
                        key={`${props.tile.name}-${tag}-${index}`}
                        isCompact
                        className={'catalog-data-list-item__tags'}
                        color={getTagColor(tag)}
                      >
                        {tag}
                      </Label>
                    ))}
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
