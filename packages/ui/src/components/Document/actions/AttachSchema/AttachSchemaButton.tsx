import { Button } from '@patternfly/react-core';
import { ImportIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { DocumentType } from '../../../../models/datamapper';
import { AttachSchemaModal } from './AttachSchemaModal';
import { UpdateSchemaWarningModal } from './UpdateSchemaWarningModal';

type AttachSchemaProps = {
  documentType: DocumentType;
  documentId: string;
  documentReferenceId: string;
  hasSchema?: boolean;
};

export const AttachSchemaButton: FunctionComponent<AttachSchemaProps> = ({
  documentType,
  documentId,
  documentReferenceId,
  hasSchema = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);

  const actionName = hasSchema ? 'Update' : 'Attach';

  const documentTypeLabel = useMemo(() => {
    if (documentType === DocumentType.PARAM) return `Parameter: ${documentId}`;
    return documentType === DocumentType.SOURCE_BODY ? 'Source' : 'Target';
  }, [documentId, documentType]);

  const onAttachSchemaModalOpen = useCallback(() => {
    setIsWarningModalOpen(false);
    setIsModalOpen(true);
  }, []);

  const onModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const onWarningModalOpen = useCallback(() => {
    setIsWarningModalOpen(true);
  }, []);

  const onWarningModalClose = useCallback(() => {
    setIsWarningModalOpen(false);
  }, []);

  const handleWarningModal = useCallback(() => {
    if (actionName === 'Update') {
      onWarningModalOpen();
    } else {
      onAttachSchemaModalOpen();
    }
  }, [actionName, onAttachSchemaModalOpen, onWarningModalOpen]);

  return (
    <>
      <Button
        icon={<ImportIcon />}
        variant="plain"
        title={`${actionName} schema`}
        aria-label={`${actionName} schema`}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={handleWarningModal}
      />

      <UpdateSchemaWarningModal
        actionName={actionName}
        documentTypeLabel={documentTypeLabel}
        isModalOpen={isWarningModalOpen}
        onProceed={onAttachSchemaModalOpen}
        onCancel={onWarningModalClose}
      />

      <AttachSchemaModal
        isModalOpen={isModalOpen}
        onModalClose={onModalClose}
        documentType={documentType}
        documentId={documentId}
        documentReferenceId={documentReferenceId}
        actionName={actionName}
        documentTypeLabel={documentTypeLabel}
      />
    </>
  );
};
