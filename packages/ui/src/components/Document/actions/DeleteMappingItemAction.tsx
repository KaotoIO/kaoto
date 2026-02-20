import {
  ActionListItem,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useToggle } from '../../../hooks/useToggle';
import { ConditionItem } from '../../../models/datamapper/mapping';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import { useDocumentTreeStore } from '../../../store';

type DeleteItemProps = {
  nodeData: TargetNodeData;
  onDelete: () => void;
};

export const DeleteMappingItemAction: FunctionComponent<DeleteItemProps> = ({ nodeData, onDelete }) => {
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);
  const refreshConnectionPorts = useDocumentTreeStore((state) => state.refreshConnectionPorts);

  const onConfirmDelete = useCallback(() => {
    VisualizationService.deleteMappingItem(nodeData);
    refreshConnectionPorts();
    onDelete();
    closeModal();
  }, [closeModal, nodeData, onDelete, refreshConnectionPorts]);
  const title = `Delete ${nodeData.title} mapping`;
  let warningMessage = undefined;
  if (
    nodeData.mapping &&
    nodeData.mapping instanceof ConditionItem &&
    nodeData.mapping.children.length > 0 &&
    nodeData.mapping.children[0].children.length > 0
  ) {
    warningMessage = `Deleting a ${nodeData.title} mapping will also remove all its child mappings.`;
  }

  return (
    <ActionListItem key="delete-item">
      <Button
        icon={<TrashIcon />}
        variant="plain"
        title={title}
        aria-label={title}
        data-testid="delete-mapping-btn"
        onClick={openModal}
      />
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title={title}
        onClose={closeModal}
        data-testid="delete-mapping-modal"
      >
        <ModalHeader title={title} titleIconVariant={warningMessage ? 'warning' : undefined} />
        <ModalBody>
          <p>{title}?</p>
          {warningMessage && <p>{warningMessage}</p>}
        </ModalBody>
        <ModalFooter>
          <Button key="confirm" variant="primary" onClick={onConfirmDelete} data-testid="delete-mapping-confirm-btn">
            Confirm
          </Button>
          <Button key="cancel" variant="link" onClick={closeModal} data-testid="delete-mapping-cancel-btn">
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </ActionListItem>
  );
};
