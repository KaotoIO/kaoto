import { Undo } from '@carbon/icons-react';
import { DropdownItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';

type ResetMappingsDropdownItemProps = {
  onComplete: () => void;
};

export const ResetMappingsDropdownItem: FunctionComponent<ResetMappingsDropdownItemProps> = ({ onComplete }) => {
  const { resetMappingTree } = useDataMapper();

  const onClick = useCallback(() => {
    resetMappingTree();
    onComplete();
  }, [onComplete, resetMappingTree]);

  return (
    <DropdownItem icon={<Undo />} onClick={onClick} data-testid="dm-debug-reset-mappings-button">
      Reset Mappings
    </DropdownItem>
  );
};
