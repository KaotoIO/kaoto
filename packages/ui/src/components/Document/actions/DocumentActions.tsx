import { ActionListGroup, ActionListItem } from '@patternfly/react-core';
import { AttachSchemaButton } from './AttachSchemaButton';
import { DetachSchemaButton } from './DetachSchemaButton';
import { DocumentType } from '../../../models/datamapper/path';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { DeleteParameterButton } from './DeleteParameterButton';
import { FunctionComponent, MouseEvent, useCallback } from 'react';
import '../Document.scss';

type DocumentActionsProps = {
  nodeData: DocumentNodeData;
};

export const DocumentActions: FunctionComponent<DocumentActionsProps> = ({ nodeData }) => {
  const documentType = nodeData.document.documentType;
  const documentId = nodeData.document.documentId;
  const handleStopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup key={`document-actions-${documentType}-${documentId}`} onClick={handleStopPropagation}>
      <ActionListItem>
        <AttachSchemaButton
          documentType={documentType}
          documentId={documentId}
          hasSchema={!nodeData.isPrimitive}
        ></AttachSchemaButton>
      </ActionListItem>
      <ActionListItem>
        <DetachSchemaButton documentType={documentType} documentId={documentId}></DetachSchemaButton>
      </ActionListItem>
      {documentType === DocumentType.PARAM && (
        <ActionListItem>
          <DeleteParameterButton parameterName={documentId} />
        </ActionListItem>
      )}
    </ActionListGroup>
  );
};
