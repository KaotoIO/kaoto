import { FunctionComponent, PropsWithChildren } from 'react';
import { CatalogKind } from '../../models';
import { NodeIconResolver, NodeIconType } from '../../utils/node-icon-resolver';
import { ITile } from '../Catalog/Catalog.models';

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
          src={NodeIconResolver.getIcon(`kamelet:${props.tile.name}`, NodeIconType.Kamelet)}
          alt="kamelet icon"
        />
      );
    case CatalogKind.Processor:
    case CatalogKind.Component:
      // eslint-disable-next-line no-case-declarations
      const iconType = props.tile.type === CatalogKind.Processor ? NodeIconType.EIP : NodeIconType.Component;
      return (
        <img
          className={props.className}
          src={NodeIconResolver.getIcon(props.tile.name, iconType)}
          alt={`${props.tile.type} icon`}
        />
      );
  }
  return <img className={props.className} src={NodeIconResolver.getDefaultCamelIcon()} alt="camel icon" />;
};
