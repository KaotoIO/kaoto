import { FunctionComponent, useCallback } from 'react';
import { ActionListItem, Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useToggle } from '../../../hooks';
import { TargetNodeData } from '../../../models/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import { useCanvas } from '../../../hooks/useCanvas';
import { ConditionItem } from '../../../models/mapping';

type DeleteItemProps = {
  nodeData: TargetNodeData;
  onDelete: () => void;
};

export const DeleteMappingItemAction: FunctionComponent<DeleteItemProps> = ({ nodeData, onDelete }) => {
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);
  const { clearNodeReferencesForPath, reloadNodeReferences } = useCanvas();

  const onConfirmDelete = useCallback(() => {
    if (nodeData.mapping && nodeData.mapping instanceof ConditionItem) {
      clearNodeReferencesForPath(nodeData.mapping.nodePath.toString());
      reloadNodeReferences();
    }
    VisualizationService.deleteMappingItem(nodeData);
    onDelete();
    closeModal();
  }, [clearNodeReferencesForPath, closeModal, nodeData, onDelete, reloadNodeReferences]);
  const title = `Delete ${nodeData.title} mapping`;

  return (
    <ActionListItem key="delete-item">
      <Tooltip position={'auto'} enableFlip={true} content={<div>{title}</div>}>
        <Button variant="plain" aria-label={title} data-testid="delete-mapping-btn" onClick={openModal}>
          <TrashIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title={title}
        onClose={closeModal}
        data-testid="delete-mapping-modal"
        actions={[
          <Button key="confirm" variant="primary" onClick={onConfirmDelete} data-testid="delete-mapping-confirm-btn">
            Confirm
          </Button>,
          <Button key="cancel" variant="link" onClick={closeModal} data-testid="delete-mapping-cancel-btn">
            Cancel
          </Button>,
        ]}
      >
        {title}?
      </Modal>
    </ActionListItem>
  );
};
