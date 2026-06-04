import { FunctionComponent, PropsWithChildren } from 'react';

import { useAutoSwitchCatalog } from './useAutoSwitchCatalog';

export const CatalogAutoSwitcher: FunctionComponent<PropsWithChildren> = ({ children }) => {
  useAutoSwitchCatalog();
  return <>{children}</>;
};
