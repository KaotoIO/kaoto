import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

import { CatalogKind } from '../../models/catalog-kind';
import { NodeIconResolver } from './node-icon-resolver';

interface IconResolverProps {
  catalogKind: CatalogKind;
  name: string;
  className?: string;
  alt?: string;
}

export const IconResolver: FunctionComponent<PropsWithChildren<IconResolverProps>> = ({
  catalogKind,
  name,
  className,
  alt: altProps,
}) => {
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [altText, setAltText] = useState<string | undefined>(altProps);

  useEffect(() => {
    let iconName: string;
    let alt: string;

    switch (catalogKind) {
      case CatalogKind.Entity:
        iconName = name;
        alt = altProps ?? 'Entity icon';
        break;
      case CatalogKind.Kamelet:
        iconName = `kamelet:${name}`;
        alt = altProps ?? 'Kamelet icon';
        break;
      case CatalogKind.TestAction:
      case CatalogKind.TestActionGroup:
      case CatalogKind.TestContainer:
      case CatalogKind.TestEndpoint:
      case CatalogKind.TestFunction:
      case CatalogKind.TestValidationMatcher:
        iconName = name;
        alt = altProps ?? `Test ${catalogKind.substring('test'.length)} icon`;
        break;
      case CatalogKind.Processor:
      case CatalogKind.Pattern:
      case CatalogKind.Component:
        iconName = name;
        alt = altProps ?? `${catalogKind} icon`;
        break;
      default:
        setIcon(NodeIconResolver.getDefaultCamelIcon());
        return;
    }

    NodeIconResolver.getIcon(iconName, catalogKind).then((icon) => {
      setIcon(icon);
      setAltText(alt);
    });
  }, [altProps, catalogKind, name]);

  if (!icon) return null;
  return <img className={className} src={icon} alt={altText} />;
};
