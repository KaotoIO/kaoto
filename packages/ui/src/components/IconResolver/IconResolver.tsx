import { FunctionComponent, PropsWithChildren } from 'react';
import { CatalogKind, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog/Catalog.models';
import { NodeIconResolver } from '../../utils/node-icon-resolver';

interface IconResolverProps {
  className?: string;
  tile: ITile;
}

export const IconResolver: FunctionComponent<PropsWithChildren<IconResolverProps>> = (props) => {
  switch (props.tile.type) {
    case CatalogKind.Kamelet:
      return (
        <img
          className={props.className}
          src={(props.tile.rawObject as IKameletDefinition).metadata.annotations['camel.apache.org/kamelet.icon']}
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
