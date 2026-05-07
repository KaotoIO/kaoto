import { ReactNode } from 'react';

import { MappingActionKind } from '../../../../models/datamapper/mapping-action';

export interface ModalAction {
  kind: MappingActionKind;
  open: () => void;
  render: () => ReactNode;
}
