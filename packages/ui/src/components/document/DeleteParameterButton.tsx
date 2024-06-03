import { FunctionComponent, useCallback } from 'react';
import { Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useDataMapper, useToggle } from '../../hooks';
import { MappingService } from '../../services/mapping.service';
import { DocumentType } from '../../models/document';

type DeleteParameterProps = {
  parameterName: string;
};

export const DeleteParameterButton: FunctionComponent<DeleteParameterProps> = ({ parameterName }) => {
  const { mappingTree, setMappingTree, sourceParameterMap, refreshSourceParameters } = useDataMapper();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, DocumentType.PARAM, parameterName);
    setMappingTree(cleaned);
    sourceParameterMap.delete(parameterName);
    refreshSourceParameters();
    closeModal();
  }, [closeModal, mappingTree, parameterName, refreshSourceParameters, setMappingTree, sourceParameterMap]);

  return (
    <>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Delete parameter</div>}>
        <Button
          variant="plain"
          aria-label="Delete parameter"
          data-testid={`delete-parameter-${parameterName}-button`}
          onClick={openModal}
        >
          <TrashIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Delete parameter"
        actions={[
          <Button key="confirm" variant="primary" onClick={onConfirmDelete}>
            Confirm
          </Button>,
          <Button key="cancel" variant="link" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        Delete parameter "{parameterName}"? Related mappings will be also removed.
      </Modal>
    </>
  );
};
