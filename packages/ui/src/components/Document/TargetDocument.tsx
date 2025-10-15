import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Card, CardBody } from '@patternfly/react-core';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import './Document.scss';
import { TargetDocumentNode } from './TargetDocumentNode';

type DocumentProps = {
  document: IDocument;
  customTitle?: string;
  onScroll?: () => void;
};

/**
 * Tree-based target document component for virtual scrolling implementation
 * Uses pre-parsed tree structure with simplified UI state management
 * Rebuilds tree when mappings change while preserving expansion state
 */
export const TargetDocument: FunctionComponent<DocumentProps> = ({ document, customTitle, onScroll }) => {
  const { mappingTree } = useDataMapper();
  const documentNodeData = useMemo(() => new TargetDocumentNodeData(document, mappingTree), [document, mappingTree]);

  const documentId = documentNodeData.id;
  const [tree, setTree] = useState<DocumentTree | undefined>(undefined);
  useEffect(() => {
    setTree(TreeUIService.createTree(documentNodeData));
  }, [documentNodeData]);

  if (!tree) {
    return <div>Loading tree...</div>;
  }
  // Override the title if customTitle is provided
  if (customTitle) {
    documentNodeData.title = customTitle;
  }

  return (
    <Card className="document-panel">
      <CardBody onScroll={onScroll}>
        <TargetDocumentNode
          treeNode={tree.root}
          documentId={documentId}
          rank={0}
        />
      </CardBody>
    </Card>
  );
};
