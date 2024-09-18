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
import { useDataMapper } from '../../../hooks/useDataMapper';
import { useToggle } from '../../../hooks/useToggle';
import { DocumentDefinition, DocumentDefinitionType } from '../../../models/datamapper/document';
import { DocumentType } from '../../../models/datamapper/path';
import { useCanvas } from '../../../hooks/useCanvas';

type DeleteSchemaProps = {
  documentType: DocumentType;
  documentId: string;
};

export const DetachSchemaButton: FunctionComponent<DeleteSchemaProps> = ({ documentType, documentId }) => {
  const { updateDocumentDefinition } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const definition = new DocumentDefinition(documentType, DocumentDefinitionType.Primitive, documentId);
    updateDocumentDefinition(definition);
    clearNodeReferencesForDocument(documentType, documentId);
    reloadNodeReferences();
    closeModal();
  }, [
    documentType,
    documentId,
    updateDocumentDefinition,
    clearNodeReferencesForDocument,
    reloadNodeReferences,
    closeModal,
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
