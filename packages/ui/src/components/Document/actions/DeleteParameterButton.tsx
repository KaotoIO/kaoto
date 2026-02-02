import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { useToggle } from '../../../hooks/useToggle';
import { DocumentType } from '../../../models/datamapper/document';
import { MappingService } from '../../../services/mapping.service';

type DeleteParameterProps = {
  parameterName: string;
  parameterReferenceId: string;
};

export const DeleteParameterButton: FunctionComponent<DeleteParameterProps> = ({
  parameterName,
  parameterReferenceId,
}) => {
  const { mappingTree, setMappingTree, refreshMappingTree, deleteSourceParameter } = useDataMapper();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, DocumentType.PARAM, parameterReferenceId);
    setMappingTree(cleaned);
    deleteSourceParameter(parameterName);
    refreshMappingTree();
    closeModal();
  }, [
    closeModal,
    deleteSourceParameter,
    mappingTree,
    parameterName,
    parameterReferenceId,
    refreshMappingTree,
    setMappingTree,
  ]);

  return (
    <>
      <Button
        icon={<TrashIcon />}
        variant="plain"
        title="Delete parameter"
        aria-label="Delete parameter"
        data-testid={`delete-parameter-${parameterName}-button`}
        onClick={openModal}
      />

      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        data-testid="delete-parameter-modal"
        onClose={closeModal}
      >
        <ModalHeader title="Delete parameter" />
        <ModalBody>Delete parameter &quot;{parameterName}&quot;? Related mappings will be also removed.</ModalBody>
        <ModalFooter>
          <Button
            key="confirm"
            variant="primary"
            data-testid="delete-parameter-modal-confirm-btn"
            onClick={onConfirmDelete}
          >
            Confirm
          </Button>
          <Button key="cancel" variant="link" data-testid="delete-parameter-modal-cancel-btn" onClick={closeModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
