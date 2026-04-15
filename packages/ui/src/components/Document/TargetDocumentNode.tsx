import clsx from 'clsx';
import { FunctionComponent, KeyboardEvent, memo, MouseEvent, MouseEventHandler, useCallback, useMemo } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingItem } from '../../models/datamapper/mapping';
import { AddMappingNodeData, TargetDocumentNodeData, TargetNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import { OverrideIndicator } from './actions/FieldOverride/OverrideIndicator';
import { withFieldOverrideContextMenu } from './actions/FieldOverride/withFieldOverrideContextMenu';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { AddMappingNode } from './AddMappingNode';
import { handleNodeKeyDown } from './document-node.utils';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle/NodeTitle';

type DocumentNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly?: boolean;
  rank: number;
  onContextMenu?: MouseEventHandler;
};

/**
 * Tree-based target node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = memo(
  ({ treeNode, documentId, rank, onContextMenu }) => {
    const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);

    const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
    const nodeData = treeNode.nodeData as TargetDocumentNodeData;

    const isDocument = nodeData.isDocument;
    const isPrimitive = nodeData.isDocument && nodeData.isPrimitive;
    const hasChildren = VisualizationService.hasChildren(nodeData);

    const handleClickToggle = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation();
        if (!hasChildren) return;
        TreeUIService.toggleNode(documentId, treeNode.path);
      },
      [hasChildren, documentId, treeNode.path],
    );

    const nodePathString = nodeData.path.toString();
    const showNodeActions = useMemo(() => (isDocument && isPrimitive) || !isDocument, [isDocument, isPrimitive]);
    const field = VisualizationService.getField(nodeData);
    const mappingItem = nodeData.mapping instanceof MappingItem ? nodeData.mapping : undefined;

    const { mappingTree, refreshMappingTree } = useDataMapper();
    const handleUpdate = useCallback(() => {
      refreshMappingTree();
    }, [refreshMappingTree]);

    const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString, false));

    const handleClickField = useCallback(
      (event: MouseEvent) => {
        toggleSelectedNode(nodePathString, false);
        event.stopPropagation();
      },
      [toggleSelectedNode, nodePathString],
    );

    const handleDoubleClickField = useCallback(() => {
      VisualizationService.applyValueSelector(nodeData as TargetNodeData);
      handleUpdate();
    }, [nodeData, handleUpdate]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => handleNodeKeyDown(event, () => toggleSelectedNode(nodePathString, false)),
      [nodePathString, toggleSelectedNode],
    );

    if (nodeData instanceof AddMappingNodeData) {
      return <AddMappingNode nodeData={nodeData} rank={rank} />;
    }

    return (
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        data-testid={`node-target-${nodeData.id}`}
        data-selected={isSelected}
        className="node__container"
        onClick={handleClickField}
        onDoubleClick={handleDoubleClickField}
        onKeyDown={handleKeyDown}
        onContextMenu={onContextMenu}
      >
        <NodeContainer nodeData={nodeData}>
          <div className="node__header">
            <NodeContainer nodeData={nodeData} className={clsx({ 'selected-container': isSelected })}>
              <BaseNode
                nodeData={nodeData}
                data-testid={nodeData.title}
                isExpandable={hasChildren}
                isExpanded={isExpanded}
                onExpandChange={handleClickToggle}
                mapping={mappingItem}
                onUpdate={handleUpdate}
                title={
                  <NodeTitle
                    className="node__spacer"
                    nodeData={nodeData}
                    isDocument={isDocument}
                    rank={rank}
                    namespaceMap={mappingTree.namespaceMap}
                  />
                }
                rank={rank}
                isSelected={isSelected}
                nodePath={nodePathString}
                documentId={documentId}
              >
                <OverrideIndicator field={field} namespaceMap={mappingTree.namespaceMap} />
                {showNodeActions ? (
                  <TargetNodeActions
                    className="node__target__actions"
                    nodeData={nodeData as TargetNodeData}
                    onUpdate={handleUpdate}
                  />
                ) : (
                  <span className="node__target__actions" />
                )}

                {isDocument && <DocumentActions nodeData={nodeData} onRenameClick={() => {}} />}
              </BaseNode>
            </NodeContainer>
          </div>
        </NodeContainer>
      </div>
    );
  },
);

TargetDocumentNode.displayName = 'TargetDocumentNode';

export const TargetDocumentNodeWithContextMenu = withFieldOverrideContextMenu(TargetDocumentNode);
