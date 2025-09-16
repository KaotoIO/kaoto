import { ActionListGroup, ActionListItem } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback } from 'react';
import { DocumentType } from '../../../models/datamapper/document';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import '../Document.scss';
import { AttachSchemaButton } from './AttachSchemaButton';
import { DeleteParameterButton } from './DeleteParameterButton';
import { DetachSchemaButton } from './DetachSchemaButton';
import { RenameParameterButton } from './RenameParameterButton';

type DocumentActionsProps = {
  className?: string;
  nodeData: DocumentNodeData;
  onRenameClick: () => void;
};

export const DocumentActions: FunctionComponent<DocumentActionsProps> = ({ className, nodeData, onRenameClick }) => {
  const documentType = nodeData.document.documentType;
  const documentId = nodeData.document.documentId;
  const handleStopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup
      key={`document-actions-${documentType}-${documentId}`}
      onClick={handleStopPropagation}
      className={className}
    >
      <ActionListItem>
        <AttachSchemaButton documentType={documentType} documentId={documentId} hasSchema={!nodeData.isPrimitive} />
      </ActionListItem>
      <ActionListItem>
        <DetachSchemaButton documentType={documentType} documentId={documentId} />
      </ActionListItem>
      {documentType === DocumentType.PARAM && (
        <>
          <ActionListItem>
            <RenameParameterButton parameterName={documentId} onRenameClick={onRenameClick} />
          </ActionListItem>
          <ActionListItem>
            <DeleteParameterButton parameterName={documentId} />
          </ActionListItem>
        </>
      )}
    </ActionListGroup>
  );
};
