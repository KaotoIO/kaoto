import { FunctionComponent, useCallback } from 'react';
import { DropdownItem } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useConfirmationDialog } from '../dialogs/useConfirmationDialog';
import { ConfigModel } from '../../_bk_atlasmap/core';

export const ResetDropdownItem: FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [resetDialog, openResetDialog] = useConfirmationDialog(
    'Reset All Mappings and Imports?',
    'Are you sure you want to reset all mappings and clear all imported documents?',
  );

  const onReset = useCallback(() => {
    const cfg = ConfigModel.getConfig();
    cfg.initializationService.resetAtlasMap();
    onComplete();
  }, [onComplete]);

  const onClick = useCallback(() => {
    openResetDialog(onReset);
  }, [onReset, openResetDialog]);

  return (
    <DropdownItem icon={<TrashIcon />} onClick={onClick} data-testid="reset-all-button">
      Reset all mappings and clear all imported documents
      {resetDialog}
    </DropdownItem>
  );
};
