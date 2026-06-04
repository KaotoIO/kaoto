import clsx from 'clsx';
import { FunctionComponent, KeyboardEvent, memo, MouseEvent, MouseEventHandler, useCallback, useMemo } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingItem } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  TargetDocumentNodeData,
  TargetNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { VisualizationService } from '../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../services/visualization/visualization-util.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import { OverrideIndicator } from './actions/FieldOverride/OverrideIndicator';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { withFieldContextMenu } from './actions/withFieldContextMenu';
import { AddMappingNode } from './AddMappingNode';
import { handleNodeKeyDown } from './document-node.utils';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle/NodeTitle';
import { VariableInputPlaceholder } from './VariableInputPlaceholder';

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
    const field = VisualizationUtilService.getField(nodeData);
    const mappingItem = nodeData.mapping instanceof MappingItem ? nodeData.mapping : undefined;

    const { mappingTree, refreshMappingTree } = useDataMapper();
    const handleUpdate = useCallback(() => {
      refreshMappingTree();
    }, [refreshMappingTree]);

    const addingVariableToNodePath = useDocumentTreeStore((s) => s.addingVariableToNodePath);
    const renamingVariableId = useDocumentTreeStore((s) => s.renamingVariableId);
    const isAddingVariableHere = addingVariableToNodePath === nodePathString;
    const isRenamingThisVariable = nodeData instanceof VariableNodeData && renamingVariableId === nodeData.mapping.id;

    const targetNodeData = nodeData as TargetNodeData;
    const variableParent = targetNodeData.mapping ?? targetNodeData.mappingTree;

    const handleVariableConfirm = useCallback(
      (name: string) => {
        if (isRenamingThisVariable && nodeData instanceof VariableNodeData) {
          MappingService.updateVariable(nodeData.mapping, name, nodeData.mapping.expression);
        } else {
          const parent = MappingActionService.getOrCreateParentMapping(nodeData);
          if (parent) MappingService.addVariable(parent, name);
        }
        useDocumentTreeStore.getState().setAddingVariableTo(null);
        useDocumentTreeStore.getState().setRenamingVariable(null);
        refreshMappingTree();
      },
      [isRenamingThisVariable, nodeData, refreshMappingTree],
    );

    const handleVariableCancel = useCallback(() => {
      useDocumentTreeStore.getState().setAddingVariableTo(null);
      useDocumentTreeStore.getState().setRenamingVariable(null);
    }, []);

    const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString, false));

    const handleClickField = useCallback(
      (event: MouseEvent) => {
        toggleSelectedNode(nodePathString, false);
        event.stopPropagation();
      },
      [toggleSelectedNode, nodePathString],
    );

    const handleDoubleClickField = useCallback(() => {
      const allowValueSelector = MappingActionService.getAllowedActions(nodeData).includes(
        MappingActionKind.ValueSelector,
      );

      if (!allowValueSelector) {
        return;
      }

      MappingActionService.applyValueSelector(nodeData);
      handleUpdate();
    }, [nodeData, handleUpdate]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => handleNodeKeyDown(event, () => toggleSelectedNode(nodePathString, false)),
      [nodePathString, toggleSelectedNode],
    );

    if (nodeData instanceof AddMappingNodeData) {
      return <AddMappingNode nodeData={nodeData} rank={rank} />;
    }

    if (isRenamingThisVariable && nodeData instanceof VariableNodeData) {
      return (
        <div
          className="node__container"
          style={{ marginLeft: `calc(${rank} * 0.85rem)` }}
          data-testid={`node-target-${nodeData.id}-renaming`}
        >
          <VariableInputPlaceholder
            initialName={nodeData.mapping.name}
            parent={nodeData.mapping.parent}
            onConfirm={handleVariableConfirm}
            onCancel={handleVariableCancel}
          />
        </div>
      );
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
        {isAddingVariableHere && variableParent && (
          <div style={{ marginLeft: `calc(${rank + 1} * 0.85rem)` }}>
            <VariableInputPlaceholder
              parent={variableParent}
              onConfirm={handleVariableConfirm}
              onCancel={handleVariableCancel}
            />
          </div>
        )}
      </div>
    );
  },
);

TargetDocumentNode.displayName = 'TargetDocumentNode';

export const TargetDocumentNodeWithContextMenu = withFieldContextMenu(TargetDocumentNode);
