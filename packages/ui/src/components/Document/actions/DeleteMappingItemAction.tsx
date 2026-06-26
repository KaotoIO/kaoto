import { ActionListItem } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { InstructionItem } from '../../../models/datamapper/mapping';
import { TargetNodeData, VariableNodeData } from '../../../models/datamapper/visualization';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
import { ConfirmActionButton } from './ConfirmActionButton';

type DeleteItemProps = {
  nodeData: TargetNodeData;
  onDelete: () => void;
};

export const DeleteMappingItemAction: FunctionComponent<DeleteItemProps> = ({ nodeData, onDelete }) => {
  const onConfirmDelete = useCallback(() => {
    MappingActionService.deleteMappingItem(nodeData);
    onDelete();
  }, [nodeData, onDelete]);

  const displayName = nodeData instanceof VariableNodeData ? nodeData.displayTitle : nodeData.title;
  const title = `Delete ${displayName} mapping`;
  const warningMessage =
    nodeData.mapping instanceof InstructionItem &&
    nodeData.mapping.children.length > 0 &&
    nodeData.mapping.children[0].children.length > 0
      ? `Deleting a ${displayName} mapping will also remove all its child mappings.`
      : undefined;

  const description = (
    <>
      <p>{title}?</p>
      {warningMessage && <p>{warningMessage}</p>}
    </>
  );

  return (
    <ActionListItem key="delete-item">
      <ConfirmActionButton
        icon={<TrashIcon />}
        title={title}
        triggerTestId="delete-mapping-btn"
        modalTestId="delete-mapping-modal"
        confirmTestId="delete-mapping-confirm-btn"
        cancelTestId="delete-mapping-cancel-btn"
        modalTitle={title}
        description={description}
        titleIconVariant={warningMessage ? 'warning' : undefined}
        onConfirm={onConfirmDelete}
      />
    </ActionListItem>
  );
};
