import { Title } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useToggle } from '../../hooks/useToggle';
import { BaseDocument } from './BaseDocument';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { DeleteParameterButton } from './actions/DeleteParameterButton';
import { RenameParameterButton } from './actions/RenameParameterButton';
import { DocumentNodeData, IDocument } from '../../models/datamapper';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TreeUIService } from '../../services/tree-ui.service';
import { SourceDocumentNode } from './SourceDocumentNode';

type EditableParameterTitleProps = {
  parameterName: string;
  isRenaming: boolean;
  onComplete: () => void;
};

/**
 * Editable parameter title - shows title or input based on rename state
 */
const EditableParameterTitle: FunctionComponent<EditableParameterTitleProps> = ({
  parameterName,
  isRenaming,
  onComplete,
}) => {
  if (isRenaming) {
    return <ParameterInputPlaceholder parameter={parameterName} onComplete={onComplete} />;
  }

  return <Title headingLevel="h5">{parameterName}</Title>;
};

type ParameterDocProps = {
  document: IDocument;
  isReadOnly: boolean;
};

/**
 * Parameter document component - wraps DMDocument with parameter-specific actions
 * Uses composition to add rename and delete functionality
 */
export const ParameterDocument: FunctionComponent<ParameterDocProps> = ({ document, isReadOnly }) => {
  const { mappingTree } = useDataMapper();
  const documentNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const [treeNode, setTreeNode] = useState<DocumentTree | undefined>(undefined);
  const documentId = documentNodeData.id;
  const parameterName = document.documentId;

  useEffect(() => {
    setTreeNode(TreeUIService.createTree(documentNodeData));
  }, [documentNodeData]);

  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);

  // Track rename state
  const { state: isRenaming, toggleOn: startRenaming, toggleOff: stopRenaming } = useToggle(false);

  // Parameter-specific actions: rename and delete
  const parameterActions = [
    <RenameParameterButton key="rename" parameterName={parameterName} onRenameClick={startRenaming} />,
    <DeleteParameterButton key="delete" parameterName={parameterName} parameterReferenceId={documentReferenceId} />,
  ];
  if (!treeNode) {
    return <div>Loading tree...</div>;
  }

  return (
    <BaseDocument
      header={
        <EditableParameterTitle parameterName={parameterName} isRenaming={isRenaming} onComplete={stopRenaming} />
      }
      treeNode={treeNode.root}
      documentId={documentId}
      isReadOnly={isReadOnly}
      additionalActions={parameterActions}
      renderNodes={(childNode, readOnly) => (
        <SourceDocumentNode treeNode={childNode} documentId={documentId} isReadOnly={readOnly} rank={1} />
      )}
    />
  );
};
