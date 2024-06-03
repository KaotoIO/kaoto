import { FunctionComponent, useCallback } from 'react';
import { IMapping } from '../../models';
import { Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useDataMapper, useToggle } from '../../hooks';

type DeleteMappingButtonProps = {
  mapping: IMapping;
  onDelete: () => void;
};

export const DeleteMappingButton: FunctionComponent<DeleteMappingButtonProps> = ({ mapping, onDelete }) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const index = mappingTree.indexOf(mapping);
    if (index > -1) {
      mappingTree.splice(index, 1);
      refreshMappingTree();
      closeModal();
      onDelete();
    }
  }, [closeModal, mapping, mappingTree, onDelete, refreshMappingTree]);

  return (
    <>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Delete mapping</div>}>
        <Button variant="plain" aria-label="Delete mapping" data-testid={`delete-mapping-button`} onClick={openModal}>
          <TrashIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Delete mapping"
        actions={[
          <Button key="confirm" variant="primary" onClick={onConfirmDelete}>
            Confirm
          </Button>,
          <Button key="cancel" variant="link" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        Delete mapping?
      </Modal>
    </>
  );
};
