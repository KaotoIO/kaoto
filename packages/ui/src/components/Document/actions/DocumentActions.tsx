import { ActionListGroup, ActionListItem } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback } from 'react';
import { DocumentType } from '../../../models/datamapper/document';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { AttachSchemaButton } from './AttachSchemaButton';
import { DeleteParameterButton } from './DeleteParameterButton';
import { DetachSchemaButton } from './DetachSchemaButton';
import { RenameParameterButton } from './RenameParameterButton';
import { useDataMapper } from '../../../hooks/useDataMapper';

type DocumentActionsProps = {
  className?: string;
  nodeData: DocumentNodeData;
  onRenameClick: () => void;
};

export const DocumentActions: FunctionComponent<DocumentActionsProps> = ({ className, nodeData, onRenameClick }) => {
  const { mappingTree } = useDataMapper();
  const documentType = nodeData.document.documentType;
  const documentId = nodeData.document.documentId;
  const documentReferenceId = nodeData.document.getReferenceId(mappingTree.namespaceMap);
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
        <AttachSchemaButton
          documentType={documentType}
          documentId={documentId}
          documentReferenceId={documentReferenceId}
          hasSchema={!nodeData.isPrimitive}
        />
      </ActionListItem>
      <ActionListItem>
        <DetachSchemaButton
          documentType={documentType}
          documentId={documentId}
          documentReferenceId={documentReferenceId}
        />
      </ActionListItem>
      {documentType === DocumentType.PARAM && (
        <>
          <ActionListItem>
            <RenameParameterButton parameterName={documentId} onRenameClick={onRenameClick} />
          </ActionListItem>
          <ActionListItem>
            <DeleteParameterButton parameterName={documentId} parameterReferenceId={documentReferenceId} />
          </ActionListItem>
        </>
      )}
    </ActionListGroup>
  );
};
