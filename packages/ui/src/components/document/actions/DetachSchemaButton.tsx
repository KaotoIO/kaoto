/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { ExportIcon } from '@patternfly/react-icons';
import { useDataMapper, useToggle } from '../../../hooks';
import { PrimitiveDocument } from '../../../models/document';
import { MappingService } from '../../../services/mapping.service';
import { DocumentType } from '../../../models/path';
import { useCanvas } from '../../../hooks/useCanvas';

type DeleteSchemaProps = {
  documentType: DocumentType;
  documentId: string;
};

export const DetachSchemaButton: FunctionComponent<DeleteSchemaProps> = ({ documentType, documentId }) => {
  const {
    mappingTree,
    setMappingTree,
    sourceParameterMap,
    refreshSourceParameters,
    setSourceBodyDocument,
    setTargetBodyDocument,
  } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const cleanedMappings = MappingService.removeAllMappingsForDocument(mappingTree, documentType, documentId);
    setMappingTree(cleanedMappings);
    const primitiveDoc = new PrimitiveDocument(documentType, documentId);
    switch (documentType) {
      case DocumentType.SOURCE_BODY:
        setSourceBodyDocument(primitiveDoc);
        break;
      case DocumentType.TARGET_BODY:
        setTargetBodyDocument(primitiveDoc);
        break;
      case DocumentType.PARAM:
        sourceParameterMap.set(documentId, primitiveDoc);
        refreshSourceParameters();
        break;
    }
    clearNodeReferencesForDocument(documentType, documentId);
    reloadNodeReferences();
    closeModal();
  }, [
    mappingTree,
    documentType,
    documentId,
    setMappingTree,
    clearNodeReferencesForDocument,
    reloadNodeReferences,
    closeModal,
    setSourceBodyDocument,
    setTargetBodyDocument,
    sourceParameterMap,
    refreshSourceParameters,
  ]);

  return (
    <>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Detach schema</div>}>
        <Button
          variant="plain"
          aria-label="Detach schema"
          data-testid={`detach-schema-${documentType}-${documentId}-button`}
          onClick={openModal}
        >
          <ExportIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Detach schema"
        data-testid="detach-schema-modal"
        onClose={closeModal}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="detach-schema-modal-confirm-btn"
            onClick={onConfirmDelete}
          >
            Confirm
          </Button>,
          <Button key="cancel" variant="link" data-testid="detach-schema-modal-cancel-btn" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        Detach correlated schema and make it back to be a primitive value? Related mappings will be also removed.
      </Modal>
    </>
  );
};
