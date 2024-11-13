import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { useToggle } from '../../../hooks/useToggle';
import { MappingService } from '../../../services/mapping.service';

import { useCanvas } from '../../../hooks/useCanvas';
import { DocumentType } from '../../../models/datamapper/path';

type DeleteParameterProps = {
  parameterName: string;
};

export const DeleteParameterButton: FunctionComponent<DeleteParameterProps> = ({ parameterName }) => {
  const { mappingTree, setMappingTree, deleteSourceParameter } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, DocumentType.PARAM, parameterName);
    setMappingTree(cleaned);
    deleteSourceParameter(parameterName);
    clearNodeReferencesForDocument(DocumentType.PARAM, parameterName);
    reloadNodeReferences();
    closeModal();
  }, [
    clearNodeReferencesForDocument,
    closeModal,
    deleteSourceParameter,
    mappingTree,
    parameterName,
    reloadNodeReferences,
    setMappingTree,
  ]);

  return (
    <>
      <Button
        variant="plain"
        title="Delete parameter"
        aria-label="Delete parameter"
        data-testid={`delete-parameter-${parameterName}-button`}
        onClick={openModal}
      >
        <TrashIcon />
      </Button>

      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Delete parameter"
        data-testid="delete-parameter-modal"
        onClose={closeModal}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="delete-parameter-modal-confirm-btn"
            onClick={onConfirmDelete}
          >
            Confirm
          </Button>,
          <Button key="cancel" variant="link" data-testid="delete-parameter-modal-cancel-btn" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        Delete parameter &quot;{parameterName}&quot;? Related mappings will be also removed.
      </Modal>
    </>
  );
};
