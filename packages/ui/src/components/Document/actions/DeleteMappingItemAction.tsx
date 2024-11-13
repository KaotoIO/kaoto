import { ActionListItem, Button, Modal, ModalVariant } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';
import { useCanvas } from '../../../hooks/useCanvas';
import { useToggle } from '../../../hooks/useToggle';
import { ConditionItem } from '../../../models/datamapper/mapping';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';

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
      <Button variant="plain" title={title} aria-label={title} data-testid="delete-mapping-btn" onClick={openModal}>
        <TrashIcon />
      </Button>
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
