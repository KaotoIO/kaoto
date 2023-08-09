import { Badge, Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';
import './Tile.scss';
import { IconResolver } from '../IconResolver';
import { ITile } from './Tile.models';

interface TileProps {
  tile: ITile;
  onClick: (tile: ITile) => void;
}

export const Tile: FunctionComponent<PropsWithChildren<TileProps>> = (props) => {
  const onTileClick = useCallback(() => {
    props.onClick(props.tile);
  }, [props]);

  return (
    <Card className="tile" isClickable isCompact key={props.tile.name} id={props.tile.name} onClick={onTileClick}>
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
          {props.tile.headerTags?.map((tag) => (
            <Badge key={`${props.tile.name}-${tag}`} isRead>
              {tag}
            </Badge>
          ))}
        </div>

        <CardTitle className="tile__title">
          <span>{props.tile.title}</span>
        </CardTitle>
      </CardHeader>

      <CardBody className="tile__body">{props.tile.description}</CardBody>

      <CardFooter className="tile__header">
        {props.tile.tags?.map((tag) => (
          <Badge key={`${props.tile.name}-${tag}`} isRead>
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
};
