import { PasteIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';

import { usePasteEntity } from '../../../../hooks/usePasteEntity';
import { IDataTestID } from '../../../../models';

export const ItemPasteEntity: FunctionComponent<PropsWithChildren<IDataTestID>> = ({ 'data-testid': dataTestId }) => {
  const { isCompatible, onPasteEntity } = usePasteEntity();

  return (
    <ContextMenuItem data-testid={dataTestId} onClick={onPasteEntity} isDisabled={!isCompatible}>
      <PasteIcon />
      <span className="pf-v6-u-m-sm">Paste</span>
    </ContextMenuItem>
  );
};
