import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { ConditionMenuAction } from './actions/ConditionMenuAction';
import { DeleteMappingItemAction } from './actions/DeleteMappingItemAction';
import { XPathEditorAction } from './actions/XPathEditorAction';
import { XPathInputAction } from './actions/XPathInputAction';
import { DocumentContent, DocumentHeader } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';

type DocumentProps = {
  document: IDocument;
};

/**
 * Tree-based target document component for virtual scrolling implementation
 * Uses pre-parsed tree structure with simplified UI state management
 * Rebuilds tree when mappings change while preserving expansion state
 *
 * Composed using DocumentHeader + DocumentContent pattern instead of monolithic BaseDocument
 */
export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const documentNodeData = useMemo(() => new TargetDocumentNodeData(document, mappingTree), [document, mappingTree]);

  const documentId = documentNodeData.id;
  const [tree, setTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setTree(TreeUIService.createTree(documentNodeData));
  }, [documentNodeData]);

  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  // Get expression item for primitive target body (if it has a mapping)
  const expressionItem = useMemo(() => {
    if (!documentNodeData.isPrimitive) return null;
    return VisualizationService.getExpressionItemForNode(documentNodeData);
  }, [documentNodeData]);

  // Actions for target body document
  const documentActions = useMemo(() => {
    const actions = [];

    // XPath actions for primitive target body with mapping
    if (expressionItem) {
      actions.push(
        <XPathInputAction key="xpath-input" mapping={expressionItem} onUpdate={handleUpdate} />,
        <XPathEditorAction
          key="xpath-editor"
          nodeData={documentNodeData}
          mapping={expressionItem}
          onUpdate={handleUpdate}
        />,
      );
    }

    // Condition menu (kebab menu) before delete
    if (VisualizationService.allowConditionMenu(documentNodeData)) {
      actions.push(<ConditionMenuAction key="condition-menu" nodeData={documentNodeData} onUpdate={handleUpdate} />);
    }

    // Delete action comes last (bin icon at the end)
    if (expressionItem && VisualizationService.isDeletableNode(documentNodeData)) {
      actions.push(
        <DeleteMappingItemAction key="delete-mapping" nodeData={documentNodeData} onDelete={handleUpdate} />,
      );
    }

    return actions;
  }, [expressionItem, documentNodeData, handleUpdate]);

  const hasSchema = !documentNodeData.isPrimitive;

  if (!tree) {
    return <div>Loading tree...</div>;
  }

  return (
    <>
      <DocumentHeader
        header={<Title headingLevel="h5">Body</Title>}
        document={document}
        documentType={DocumentType.TARGET_BODY}
        isReadOnly={false}
        additionalActions={documentActions}
        enableDnD={true}
        nodeData={documentNodeData}
      />
      {hasSchema && (
        <DocumentContent
          treeNode={tree.root}
          isReadOnly={false}
          renderNodes={(childNode) => <TargetDocumentNode treeNode={childNode} documentId={documentId} rank={1} />}
        />
      )}
    </>
  );
};
