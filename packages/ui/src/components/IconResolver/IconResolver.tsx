import { FunctionComponent, PropsWithChildren } from 'react';
import defaultCamelIcon from '../../assets/camel-logo.svg';
import { CatalogKind, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog/Tile.models';

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
          alt="Kamelet icon"
        />
      );
  }

  return <img className={props.className} src={defaultCamelIcon} alt="Camel icon" />;
};
