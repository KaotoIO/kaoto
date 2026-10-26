import './TileParts.scss';

import { LabelGroup } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { ITile } from './Catalog.models';
import { CatalogTag } from './Tags';

interface TileIconProps {
  tile: Pick<ITile, 'type' | 'iconUrl'>;
  className?: string;
}

/** Tile icon, shared between the Gallery and List layouts */
export const TileIcon: FunctionComponent<TileIconProps> = ({ tile, className }) => {
  if (!tile.iconUrl) return null;

  return <img src={tile.iconUrl} className={className} alt={`${tile.type} icon`} />;
};

interface TileHeaderTagsProps {
  tile: Pick<ITile, 'name' | 'headerTags' | 'version'>;
  'aria-label': string;
  tagClassName?: string;
  /** Whether the tile version should be rendered as part of the group, defaults to `false` */
  showVersion?: boolean;
}

/** Tile header tags, shared between the Gallery and List layouts */
export const TileHeaderTags: FunctionComponent<TileHeaderTagsProps> = ({
  tile,
  'aria-label': ariaLabel,
  tagClassName,
  showVersion = false,
}) => {
  return (
    <LabelGroup isCompact aria-label={ariaLabel}>
      {tile.headerTags?.map((tag, index) => (
        <CatalogTag key={`${tile.name}-${tag}-${index}`} tag={tag} className={tagClassName} />
      ))}
      {showVersion && tile.version && (
        <CatalogTag key={tile.version} tag={tile.version} className={tagClassName} variant="outline" />
      )}
    </LabelGroup>
  );
};

interface TileProviderProps {
  provider?: string;
  className?: string;
  /** Text rendered before the provider name */
  prefix?: string;
}

/** Tile provider badge, shared between the Gallery and List layouts */
export const TileProvider: FunctionComponent<TileProviderProps> = ({ provider, className, prefix = '' }) => {
  return (
    <span
      className={className ? `catalog-tile-provider ${className}` : 'catalog-tile-provider'}
      data-provider={provider}
    >
      {prefix}
      {provider}
    </span>
  );
};
