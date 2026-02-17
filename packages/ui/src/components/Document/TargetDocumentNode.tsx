import { Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useMemo, useRef } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { TypeOverrideVariant } from '../../models/datamapper/types';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  NodeReference,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { AddMappingNode } from './AddMappingNode';
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
export const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = ({ treeNode, documentId, rank }) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;
  const iconType = nodeData instanceof FieldItemNodeData ? nodeData.field.type : nodeData.type;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isPrimitive = VisualizationService.isPrimitiveDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!hasChildren) return;

      TreeUIService.toggleNode(documentId, treeNode.path);
      reloadNodeReferences();
    },
    [hasChildren, documentId, treeNode.path, reloadNodeReferences],
  );
  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isChoiceField = VisualizationService.isChoiceField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isDraggable = !isDocument || VisualizationService.isPrimitiveDocumentNode(nodeData);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefId = nodeData.path.toString();
  const nodeReference = useRef<NodeReference>({
    path: nodeRefId,
    isSource: false,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const showNodeActions = (isDocument && isPrimitive) || !isDocument;
  const { refreshMappingTree } = useDataMapper();
  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  // Check if this node has an actual mapping (expressionItem exists)
  const hasMapping = useMemo(() => {
    if (!showNodeActions) return false;
    const expressionItem = VisualizationService.getExpressionItemForNode(nodeData as TargetNodeData);
    return !!expressionItem;
  }, [showNodeActions, nodeData]);

  // Create type override indicator if field has override and no mapping
  const typeOverrideIndicator = useMemo(() => {
    const isFieldNode = nodeData instanceof TargetFieldNodeData || nodeData instanceof FieldItemNodeData;
    if (!isFieldNode) return null;

    const field = nodeData.field;
    const hasTypeOverride = field.typeOverride !== TypeOverrideVariant.NONE;

    if (hasTypeOverride && !hasMapping) {
      return (
        <Icon
          className="node__spacer"
          size="sm"
          status="warning"
          isInline
          title={`Type overridden: ${field.originalType} → ${field.type}`}
        >
          <WrenchIcon />
        </Icon>
      );
    }
    return null;
  }, [nodeData, hasMapping]);

  const isSelected = isInSelectedMapping(nodeReference);
  const handleClickField = useCallback(
    (event: MouseEvent) => {
      toggleSelectedNodeReference(nodeReference);
      event.stopPropagation();
    },
    [toggleSelectedNodeReference],
  );

  return (
    <div
      data-testid={`node-target-${nodeData.id}`}
      data-selected={isSelected}
      className="node__container"
      onClick={handleClickField}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className="node__header">
          <NodeContainer nodeData={nodeData} ref={headerRef} className={clsx({ 'selected-container': isSelected })}>
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
              typeOverrideIndicator={typeOverrideIndicator}
              rank={rank}
              isSelected={isSelected}
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

        {hasChildren && isExpanded && (
          <div className="node__children">
            {treeNode.children.map((childTreeNode) =>
              childTreeNode.nodeData instanceof AddMappingNodeData ? (
                <AddMappingNode nodeData={childTreeNode.nodeData} key={childTreeNode.path} rank={rank} />
              ) : (
                <TargetDocumentNode
                  treeNode={childTreeNode}
                  documentId={documentId}
                  key={childTreeNode.path}
                  rank={rank + 1}
                />
              ),
            )}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
