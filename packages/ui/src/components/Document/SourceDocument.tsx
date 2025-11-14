import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Title } from '@patternfly/react-core';
import { IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { SourceDocumentNode } from './SourceDocumentNode';
import { BaseDocument } from './BaseDocument';

type DocumentTreeProps = {
  document: IDocument;
  isReadOnly: boolean;
};

/**
 * Tree-based source document component for virtual scrolling implementation
 * Uses pre-parsed tree structure with simplified UI state management
 */
export const SourceDocument: FunctionComponent<DocumentTreeProps> = ({ document, isReadOnly }) => {
  const documentNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const [treeNode, setTreeNode] = useState<DocumentTree | undefined>(undefined);
  const documentId = documentNodeData.id;

  useEffect(() => {
    setTreeNode(TreeUIService.createTree(documentNodeData));
  }, [documentNodeData]);

  if (!treeNode) {
    return <div>Loading tree...</div>;
  }

  return (
    <BaseDocument
      treeNode={treeNode.root}
      documentId={documentId}
      isReadOnly={isReadOnly}
      header={<Title headingLevel="h5">Body</Title>}
      renderNodes={(childNode, readOnly) => (
        <SourceDocumentNode treeNode={childNode} documentId={documentId} isReadOnly={readOnly} rank={1} />
      )}
    />
  );
};
