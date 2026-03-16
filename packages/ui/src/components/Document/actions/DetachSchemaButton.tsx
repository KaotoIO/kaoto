/*
    Copyright (C) 2024 Red Hat, Inc.

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
import { AlertVariant, Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { ExportIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { useToggle } from '../../../hooks/useToggle';
import { DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { DocumentService } from '../../../services/document.service';

type DeleteSchemaProps = {
  documentType: DocumentType;
  documentId: string;
  documentReferenceId: string;
};

export const DetachSchemaButton: FunctionComponent<DeleteSchemaProps> = ({
  documentType,
  documentId,
  documentReferenceId,
}) => {
  const { sendAlert, updateDocument } = useDataMapper();

  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const result = DocumentService.createPrimitiveDocument(documentType, DocumentDefinitionType.Primitive, documentId);

    if (result.validationStatus !== 'success') {
      const variant = result.validationStatus === 'warning' ? AlertVariant.warning : AlertVariant.danger;
      const messages = result.errors ?? result.warnings ?? [];
      sendAlert({ variant: variant, title: messages.map((m) => m.message).join('; ') });
    } else if (!result.documentDefinition || !result.document) {
      sendAlert({ variant: AlertVariant.danger, title: 'Could not detach schema' });
    } else {
      updateDocument(result.document, result.documentDefinition, documentReferenceId);
    }

    closeModal();
  }, [documentType, documentId, closeModal, sendAlert, updateDocument, documentReferenceId]);

  return (
    <>
      <Button
        icon={<ExportIcon />}
        variant="plain"
        title="Detach schema"
        aria-label="Detach schema"
        data-testid={`detach-schema-${documentType}-${documentId}-button`}
        onClick={openModal}
      />

      <Modal variant={ModalVariant.small} isOpen={isModalOpen} data-testid="detach-schema-modal" onClose={closeModal}>
        <ModalHeader title="Detach schema" />
        <ModalBody>
          Detach correlated schema and make it back to be a primitive value? Related mappings will be also removed.
        </ModalBody>
        <ModalFooter>
          <Button
            key="confirm"
            variant="primary"
            data-testid="detach-schema-modal-confirm-btn"
            onClick={onConfirmDelete}
          >
            Confirm
          </Button>
          <Button key="cancel" variant="link" data-testid="detach-schema-modal-cancel-btn" onClick={closeModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
