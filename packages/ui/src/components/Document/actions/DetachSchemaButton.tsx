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
import { AlertVariant } from '@patternfly/react-core';
import { ExportIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { DocumentService } from '../../../services/document/document.service';
import { ConfirmActionButton } from './ConfirmActionButton';

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
  }, [documentType, documentId, sendAlert, updateDocument, documentReferenceId]);

  return (
    <ConfirmActionButton
      icon={<ExportIcon />}
      title="Detach schema"
      triggerTestId={`detach-schema-${documentType}-${documentId}-button`}
      modalTestId="detach-schema-modal"
      confirmTestId="detach-schema-modal-confirm-btn"
      cancelTestId="detach-schema-modal-cancel-btn"
      modalTitle="Detach schema"
      description="Detach correlated schema and make it back to be a primitive value? Related mappings will be also removed."
      onConfirm={onConfirmDelete}
    />
  );
};
