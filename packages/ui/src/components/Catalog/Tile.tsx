import './Tile.scss';

import { Card, CardBody, CardFooter, CardHeader, CardTitle, LabelGroup } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';

import { CatalogKind } from '../../models/catalog-kind';
import { IconResolver } from '../IconResolver';
import { ITile } from './Catalog.models';
import { CatalogTag, CatalogTagsPanel } from './Tags';

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
    >
      <CardHeader
        selectableActions={{ variant: 'single', selectableActionAriaLabelledby: `Selectable ${props.tile.name}` }}
        data-testid={'tile-header-' + props.tile.name}
        onClick={onTileClick}
      >
        <div className="tile__header">
          <IconResolver className="tile__icon" catalogKind={props.tile.type as CatalogKind} name={props.tile.name} />
          <LabelGroup isCompact aria-label="tile-headers-tags">
            {props.tile.headerTags?.map((tag, index) => (
              <CatalogTag key={`${props.tile.name}-${tag}-${index}`} tag={tag} />
            ))}
          </LabelGroup>
        </div>

        <CardTitle className="tile__title">
          <span>{props.tile.title}</span>
          <span className="tile__name">({props.tile.name})</span>
          {props.tile.version && (
            <CatalogTag key={`${props.tile.version}`} tag={props.tile.version} variant="outline" />
          )}
        </CardTitle>
      </CardHeader>

      <CardBody className="tile__body">{props.tile.description}</CardBody>

      <CardFooter>
        <CatalogTagsPanel tags={props.tile.tags} onTagClick={props.onTagClick} />
      </CardFooter>

      {props.tile.provider && (
        <p className="tile__provider" data-provider={props.tile.provider}>
          Provided by {props.tile.provider}
        </p>
      )}
    </Card>
  );
};
