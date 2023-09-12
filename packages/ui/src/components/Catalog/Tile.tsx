import { Card, CardBody, CardFooter, CardHeader, CardTitle, LabelGroup } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { IconResolver } from '../IconResolver';
import { ITile } from './Catalog.models';
import { CatalogTag, CatalogTagsPanel } from './Tags';
import './Tile.scss';

interface TileProps {
  tile: ITile;
  onClick: (tile: ITile) => void;
  onTagClick: (_event: unknown, value: string) => void;
}

export const Tile: FunctionComponent<PropsWithChildren<TileProps>> = (props) => {
  const onTileClick = useCallback(() => {
    props.onClick(props.tile);
  }, [props]);

  return (
    <Card
      className="tile"
      data-testid={'tile-' + props.tile.name}
      isClickable
      isCompact
      role="button"
      key={props.tile.name}
      id={props.tile.name}
      onClick={onTileClick}
    >
      <CardHeader
        selectableActions={{
          variant: 'single',
          selectableActionId: props.tile.name,
          selectableActionAriaLabelledby: `Selectable ${props.tile.name}`,
          name: props.tile.name,
        }}
      >
        <div className="tile__header">
          <IconResolver className="tile__icon" tile={props.tile} />
          <LabelGroup isCompact aria-label="tile-headers-tags">
            {props.tile.headerTags?.map((tag, index) => (
              <CatalogTag key={`${props.tile.name}-${tag}-${index}`} tag={tag} />
            ))}
          </LabelGroup>
        </div>

        <CardTitle className="tile__title">
          <span>{props.tile.title}</span>
          {props.tile.version && (
            <CatalogTag key={`${props.tile.version}`} tag={props.tile.version} variant="outline" />
          )}
        </CardTitle>
      </CardHeader>

      <CardBody className="tile__body">{props.tile.description}</CardBody>

      <CardFooter>
        <CatalogTagsPanel tags={props.tile.tags} onTagClick={props.onTagClick} />
      </CardFooter>
    </Card>
  );
};
