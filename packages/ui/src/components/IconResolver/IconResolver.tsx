import { FunctionComponent, PropsWithChildren, use, useMemo } from 'react';

import { CatalogKind } from '../../models/catalog-kind';
import { getIconRequest } from './getIconRequest';

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
  const iconPromise = useMemo(() => getIconRequest(catalogKind, name, altProps), [catalogKind, name, altProps]);
  const { icon, alt } = use(iconPromise);

  return <img className={className} src={icon} alt={alt} />;
};
