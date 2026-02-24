import clsx from 'clsx';
import { FunctionComponent, memo, MouseEvent, useCallback } from 'react';

import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle';

type TreeSourceNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly: boolean;
  rank: number;
};

/**
 * Tree-based source node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const SourceDocumentNode: FunctionComponent<TreeSourceNodeProps> = memo(({ treeNode, documentId, rank }) => {
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);

  // Select expansion state for this specific node
  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!hasChildren) return;

      TreeUIService.toggleNode(documentId, treeNode.path);
    },
    [hasChildren, documentId, treeNode.path],
  );

  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isChoiceField = VisualizationService.isChoiceField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isDraggable = !isDocument || VisualizationService.isPrimitiveDocumentNode(nodeData);
  const nodePathString = nodeData.path.toString();

  // Get selection state from store
  const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString));

  const handleClickField = useCallback(
    (event: MouseEvent) => {
      toggleSelectedNode(nodePathString, true); // true for source nodes
      event.stopPropagation();
    },
    [toggleSelectedNode, nodePathString],
  );

  return (
    <div
      data-testid={`node-source-${nodeData.id}`}
      data-selected={isSelected}
      className="node__container"
      onClick={handleClickField}
    >
      <NodeContainer nodeData={nodeData}>
        <div className="node__header">
          <NodeContainer nodeData={nodeData} className={clsx({ 'selected-container': isSelected })}>
            <BaseNode
              data-testid={nodeData.title}
              isExpandable={hasChildren}
              isExpanded={isExpanded}
              onExpandChange={handleClickToggle}
              isDraggable={isDraggable}
              iconType={nodeData.type}
              isCollectionField={isCollectionField}
              isChoiceField={isChoiceField}
              isAttributeField={isAttributeField}
              title={<NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} rank={rank} />}
              rank={rank}
              isSelected={isSelected}
              nodePath={nodePathString}
            />
          </NodeContainer>
        </div>
      </NodeContainer>
    </div>
  );
});

SourceDocumentNode.displayName = 'SourceDocumentNode';
