import clsx from 'clsx';
import { FunctionComponent, KeyboardEvent, memo, MouseEvent, MouseEventHandler, useCallback } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { TypeOverrideIndicator } from './actions/FieldTypeOverride/FieldTypeOverride';
import { withFieldOverrideContextMenu } from './actions/FieldTypeOverride/withFieldOverrideContextMenu';
import { handleNodeKeyDown } from './document-node.utils';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle/NodeTitle';

type TreeSourceNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly: boolean;
  rank: number;
  onContextMenu?: MouseEventHandler;
};

/**
 * Tree-based source node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const SourceDocumentNode: FunctionComponent<TreeSourceNodeProps> = memo(
  ({ treeNode, documentId, rank, onContextMenu }) => {
    const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);
    const { mappingTree } = useDataMapper();

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

    const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString, true));

    const handleClickField = useCallback(
      (event: MouseEvent) => {
        toggleSelectedNode(nodePathString, true);
        event.stopPropagation();
      },
      [toggleSelectedNode, nodePathString],
    );

    const field = VisualizationService.getField(nodeData);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => handleNodeKeyDown(event, () => toggleSelectedNode(nodePathString, true)),
      [nodePathString, toggleSelectedNode],
    );

    return (
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        data-testid={`node-source-${nodeData.id}`}
        data-selected={isSelected}
        className="node__container"
        onClick={handleClickField}
        onKeyDown={handleKeyDown}
        onContextMenu={onContextMenu}
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
                iconType={field?.type ?? nodeData.type}
                isCollectionField={isCollectionField}
                isChoiceField={isChoiceField}
                isAttributeField={isAttributeField}
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
                <TypeOverrideIndicator field={field} namespaceMap={mappingTree.namespaceMap} />
              </BaseNode>
            </NodeContainer>
          </div>
        </NodeContainer>
      </div>
    );
  },
);

SourceDocumentNode.displayName = 'SourceDocumentNode';

export const SourceDocumentNodeWithContextMenu = withFieldOverrideContextMenu(SourceDocumentNode);
