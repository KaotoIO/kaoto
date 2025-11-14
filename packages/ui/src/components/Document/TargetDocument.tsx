import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { Title } from '@patternfly/react-core';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { BaseDocument } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';
import { XPathInputAction } from './actions/XPathInputAction';
import { XPathEditorAction } from './actions/XPathEditorAction';
import { DeleteMappingItemAction } from './actions/DeleteMappingItemAction';
import { ConditionMenuAction } from './actions/ConditionMenuAction';

type DocumentProps = {
  document: IDocument;
};

/**
 * Tree-based target document component for virtual scrolling implementation
 * Uses pre-parsed tree structure with simplified UI state management
 * Rebuilds tree when mappings change while preserving expansion state
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

    if (VisualizationService.allowConditionMenu(documentNodeData)) {
      actions.push(<ConditionMenuAction key="condition-menu" nodeData={documentNodeData} onUpdate={handleUpdate} />);
    }

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

      // Add delete action if the mapping is deletable
      if (VisualizationService.isDeletableNode(documentNodeData)) {
        actions.push(
          <DeleteMappingItemAction key="delete-mapping" nodeData={documentNodeData} onDelete={handleUpdate} />,
        );
      }
    }

    return actions;
  }, [expressionItem, documentNodeData, handleUpdate]);

  if (!tree) {
    return <div>Loading tree...</div>;
  }

  return (
    <BaseDocument
      header={<Title headingLevel="h5">Body</Title>}
      treeNode={tree.root}
      documentId={documentId}
      isReadOnly={false}
      additionalActions={documentActions}
      renderNodes={(childNode) => <TargetDocumentNode treeNode={childNode} documentId={documentId} rank={1} />}
    />
  );
};
