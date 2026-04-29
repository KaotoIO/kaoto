import { ReactNode } from 'react';

import { MenuGroup } from '../FieldContextMenu';

export interface MenuContributor {
  groups: MenuGroup[];
  modals: ReactNode;
}
