import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Title } from '@patternfly/react-core';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import './Document.scss';
import { BaseDocument } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';

type DocumentProps = {
  document: IDocument;
};

/**
 * Tree-based target document component for virtual scrolling implementation
 * Uses pre-parsed tree structure with simplified UI state management
 * Rebuilds tree when mappings change while preserving expansion state
 */
export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { mappingTree } = useDataMapper();
  const documentNodeData = useMemo(() => new TargetDocumentNodeData(document, mappingTree), [document, mappingTree]);

  const documentId = documentNodeData.id;
  const [tree, setTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setTree(TreeUIService.createTree(documentNodeData));
  }, [documentNodeData]);

  // TODO: Add XPath input for primitive target body when it has a mapping
  // Need to figure out how to properly get the ExpressionItem from MappingTree
  const title = <Title headingLevel="h5">Body</Title>;

  if (!tree) {
    return <div>Loading tree...</div>;
  }

  return (
    <BaseDocument
      header={title}
      treeNode={tree.root}
      documentId={documentId}
      isReadOnly={false}
      renderNodes={(childNode) => <TargetDocumentNode treeNode={childNode} documentId={documentId} rank={1} />}
    />
  );
};
