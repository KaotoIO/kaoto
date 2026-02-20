import clsx from 'clsx';
import { FunctionComponent, memo, MouseEvent, useCallback, useMemo, useRef } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { FieldItemNodeData, TargetDocumentNodeData, TargetNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle';

type DocumentNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  rank: number;
};

/**
 * Tree-based target node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = memo(({ treeNode, documentId, rank }) => {
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;
  const iconType = nodeData instanceof FieldItemNodeData ? nodeData.field.type : nodeData.type;

  const isDocument = useMemo(() => VisualizationService.isDocumentNode(nodeData), [nodeData]);
  const isPrimitive = useMemo(() => VisualizationService.isPrimitiveDocumentNode(nodeData), [nodeData]);
  const hasChildren = useMemo(() => VisualizationService.hasChildren(nodeData), [nodeData]);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!hasChildren) return;

      TreeUIService.toggleNode(documentId, treeNode.path);
    },
    [hasChildren, documentId, treeNode.path],
  );
  const isCollectionField = useMemo(() => VisualizationService.isCollectionField(nodeData), [nodeData]);
  const isChoiceField = VisualizationService.isChoiceField(nodeData);
  const isAttributeField = useMemo(() => VisualizationService.isAttributeField(nodeData), [nodeData]);
  const isDraggable = useMemo(() => !isDocument || isPrimitive, [isDocument, isPrimitive]);
  const nodePathString = nodeData.path.toString();
  const portRef = useRef<HTMLSpanElement>(null);

  const showNodeActions = useMemo(() => (isDocument && isPrimitive) || !isDocument, [isDocument, isPrimitive]);
  const { refreshMappingTree } = useDataMapper();
  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  // Get selection state from store
  const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString));

  const handleClickField = useCallback(
    (event: MouseEvent) => {
      toggleSelectedNode(nodePathString, false); // false for target nodes
      event.stopPropagation();
    },
    [toggleSelectedNode, nodePathString],
  );

  return (
    <div
      data-testid={`node-target-${nodeData.id}`}
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
              iconType={iconType}
              isCollectionField={isCollectionField}
              isChoiceField={isChoiceField}
              isAttributeField={isAttributeField}
              title={<NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} rank={rank} />}
              rank={rank}
              isSelected={isSelected}
              isSource={false}
              portRef={portRef}
              nodePath={nodePathString}
            >
              {showNodeActions ? (
                <TargetNodeActions
                  className="node__target__actions"
                  nodeData={nodeData as TargetNodeData}
                  onUpdate={handleUpdate}
                />
              ) : (
                <span className="node__target__actions" />
              )}

              {isDocument && <DocumentActions nodeData={nodeData as TargetDocumentNodeData} onRenameClick={() => {}} />}
            </BaseNode>
          </NodeContainer>
        </div>
      </NodeContainer>
    </div>
  );
});

TargetDocumentNode.displayName = 'TargetDocumentNode';
