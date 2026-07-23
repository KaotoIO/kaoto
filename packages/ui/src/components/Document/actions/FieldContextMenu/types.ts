import { ReactNode } from 'react';

import { IFieldMenuGroup } from '../../../../models/datamapper/field-action';

export interface MenuContributor {
  groups: IFieldMenuGroup[];
  modals: ReactNode;
}
