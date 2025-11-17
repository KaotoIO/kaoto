import { BarsIcon, GripHorizontalIcon, UnknownIcon } from '@patternfly/react-icons';
import * as React from 'react';

import { CatalogLayout } from './Catalog.models';

const getCatalogLayoutIcon = (layout: CatalogLayout): React.ReactNode => {
  switch (layout) {
    case CatalogLayout.Gallery:
      return <GripHorizontalIcon />;
    case CatalogLayout.List:
      return <BarsIcon />;
    default:
      return <UnknownIcon />;
  }
};

interface ICatalogLayoutIconProps {
  layout: CatalogLayout;
}

export const CatalogLayoutIcon: React.FunctionComponent<ICatalogLayoutIconProps> = (props) => {
  return getCatalogLayoutIcon(props.layout);
};
