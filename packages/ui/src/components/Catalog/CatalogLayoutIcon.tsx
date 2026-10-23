import { Grid, Menu, Unknown } from '@carbon/icons-react';
import * as React from 'react';

import { CatalogLayout } from './Catalog.models';

const getCatalogLayoutIcon = (layout: CatalogLayout): React.ReactNode => {
  switch (layout) {
    case CatalogLayout.Gallery:
      return <Grid />;
    case CatalogLayout.List:
      return <Menu />;
    default:
      return <Unknown />;
  }
};

interface ICatalogLayoutIconProps {
  layout: CatalogLayout;
}

export const CatalogLayoutIcon: React.FunctionComponent<ICatalogLayoutIconProps> = (props) => {
  return getCatalogLayoutIcon(props.layout);
};
