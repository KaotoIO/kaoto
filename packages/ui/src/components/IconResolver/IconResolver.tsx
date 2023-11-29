import { FunctionComponent, PropsWithChildren } from 'react';
import { CatalogKind } from '../../models';
import { NodeIconResolver } from '../../utils/node-icon-resolver';
import { ITile } from '../Catalog/Catalog.models';

interface IconResolverProps {
  className?: string;
  tile: ITile;
}

export const IconResolver: FunctionComponent<PropsWithChildren<IconResolverProps>> = (props) => {
  switch (props.tile.type) {
    case CatalogKind.Kamelet:
    case CatalogKind.KameletBoundary:
      return (
        <img
          className={props.className}
          src={NodeIconResolver.getIcon(`kamelet:${props.tile.name}`)}
          alt="kamelet icon"
        />
      );
    case CatalogKind.Processor:
    case CatalogKind.Component:
      return (
        <img
          className={props.className}
          src={NodeIconResolver.getIcon(props.tile.name)}
          alt={`${props.tile.type} icon`}
        />
      );
  }
  return <img className={props.className} src={NodeIconResolver.getDefaultCamelIcon()} alt="camel icon" />;
};
