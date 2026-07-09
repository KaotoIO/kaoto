import { ReactNode } from 'react';

import { Types } from '../../../../models/datamapper/types';
import { MenuGroup } from '../FieldContextMenu';

export interface MenuContributor {
  groups: MenuGroup[];
  modals: ReactNode;
}

export interface MemberSelection {
  memberIndex: number;
  substituteQName?: string;
}

export interface WrapperCandidate {
  key: string;
  label: string;
  typeBadge: Types;
  description?: string;
  childrenPreview?: string[];
  selection: MemberSelection;
}
