import { FunctionComponent, useCallback } from 'react';
import { ActionListGroup, ActionListItem, Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useToggle } from '../../../../hooks';
import { NodeData } from '../../../../models/visualization';
import { VisualizationService } from '../../../../services/visualization.service';

type DeleteItemProps = {
  nodeData: NodeData;
  onDelete: () => void;
};

export const DeleteItemAction: FunctionComponent<DeleteItemProps> = ({ nodeData, onDelete }) => {
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    VisualizationService.deleteMappingItem(nodeData);
    onDelete();
    closeModal();
  }, [closeModal, nodeData, onDelete]);
  const title = `Delete ${nodeData.title} mapping`;

  return (
    <ActionListGroup>
      <ActionListItem>
        <Tooltip position={'auto'} enableFlip={true} content={<div>{title}</div>}>
          <Button variant="plain" aria-label={title} data-testid={`delete-mapping-button`} onClick={openModal}>
            <TrashIcon />
          </Button>
        </Tooltip>
        <Modal
          variant={ModalVariant.small}
          isOpen={isModalOpen}
          title={title}
          actions={[
            <Button key="confirm" variant="primary" onClick={onConfirmDelete}>
              Confirm
            </Button>,
            <Button key="cancel" variant="link" onClick={closeModal}>
              Cancel
            </Button>,
          ]}
        >
          {title}?
        </Modal>
      </ActionListItem>
    </ActionListGroup>
  );
};
