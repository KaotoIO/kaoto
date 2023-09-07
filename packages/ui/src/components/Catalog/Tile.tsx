import { Card, CardBody, CardFooter, CardHeader, CardTitle, Label } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { IconResolver } from '../IconResolver';
import { ITile } from './Catalog.models';
import './Tile.scss';
import { getTagColor } from './tag-color-resolver';

interface TileProps {
  tile: ITile;
  onClick: (tile: ITile) => void;
}

export const Tile: FunctionComponent<PropsWithChildren<TileProps>> = (props) => {
  const onTileClick = useCallback(() => {
    props.onClick(props.tile);
  }, [props]);

  return (
    <Card
      className="tile"
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
          {props.tile.headerTags?.map((tag, index) => (
            <Label key={`${props.tile.name}-${tag}-${index}`} isCompact color={getTagColor(tag)}>
              {tag}
            </Label>
          ))}
        </div>

        <CardTitle className="tile__title">
          <span>{props.tile.title}</span>
        </CardTitle>
      </CardHeader>

      <CardBody className="tile__body">{props.tile.description}</CardBody>

      <CardFooter className="tile__footer">
        {props.tile.tags?.map((tag, index) => (
          <Label key={`${props.tile.name}-${tag}-${index}`} isCompact className={'tile__tags'} color={getTagColor(tag)}>
            {tag}
          </Label>
        ))}
        {props.tile.version && (
          <Label key={`${props.tile.version}`} isCompact className={'tile__tags'} variant="outline">
            {props.tile.version}
          </Label>
        )}
      </CardFooter>
    </Card>
  );
};
