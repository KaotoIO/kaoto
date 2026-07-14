import './RestTree.scss';

import { TrashCan } from '@carbon/icons-react';
import { Menu, MenuItem, TreeNode, TreeView } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { BaseVisualEntity } from '../../../models/visualization/base-visual-entity';
import { restToTree } from '../rest-to-tree';
import { MethodBadge } from './MethodBadge';

/** Represents a selected item in the REST tree */
export type IRestTreeSelection = { entityId: string; modelPath: string };

/**
 * Props for the RestTree component.
 */
export interface IRestTree extends PropsWithChildren {
  entities: BaseVisualEntity[];
  selected?: IRestTreeSelection;
  onSelect: (selection: IRestTreeSelection) => void;
  onDelete: () => void;
}

/**
 * Tree view component for displaying REST DSL configurations and services.
 * Shows REST configurations and REST services with their methods in a hierarchical structure.
 */
export const RestTree: FunctionComponent<IRestTree> = ({ entities, selected, onSelect, onDelete, children }) => {
  const restTreeNodes = restToTree(entities);
  const [contextMenuState, setContextMenuState] = useState<{ nodeId: string; x: number; y: number }>();
  const contextMenuRef = useRef<HTMLUListElement>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(undefined);
  }, []);

  useEffect(() => {
    if (!contextMenuState) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !contextMenuRef.current?.contains(event.target)) {
        closeContextMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [closeContextMenu, contextMenuState]);

  /** Generates a unique node ID from entity ID and model path */
  const getNodeId = (entityId: string, modelPath: string) => `${entityId}::${modelPath}`;
  const activeNodeId = selected ? getNodeId(selected.entityId, selected.modelPath) : undefined;
  const selectionsByNodeId = new Map<string, IRestTreeSelection>();

  restTreeNodes.forEach((node) => {
    selectionsByNodeId.set(getNodeId(node.entityId, node.modelPath), {
      entityId: node.entityId,
      modelPath: node.modelPath,
    });
    node.children?.forEach((child) => {
      selectionsByNodeId.set(getNodeId(child.entityId, child.modelPath), {
        entityId: child.entityId,
        modelPath: child.modelPath,
      });
    });
  });

  return (
    <>
      <div>{children}</div>

      <div
        className="rest-tree"
        onContextMenu={(event) => {
          if (!(event.target instanceof Element)) return;

          const treeItem = event.target.closest('[role="treeitem"]');
          if (!(treeItem instanceof HTMLElement) || !event.currentTarget.contains(treeItem)) return;

          const selection = selectionsByNodeId.get(treeItem.id);
          if (!selection) return;

          event.preventDefault();
          if (selection.entityId !== selected?.entityId || selection.modelPath !== selected.modelPath) {
            onSelect(selection);
          }
          treeItem.focus();
          setContextMenuState({ nodeId: treeItem.id, x: event.clientX, y: event.clientY });
        }}
      >
        <TreeView label="Rest DSL Configuration" active={activeNodeId}>
          {restTreeNodes.map((node) => {
            const nodeId = getNodeId(node.entityId, node.modelPath);
            return (
              <TreeNode
                isExpanded
                key={nodeId}
                id={nodeId}
                label={node.id}
                onSelect={() => {
                  onSelect({ entityId: node.entityId, modelPath: node.modelPath });
                }}
              >
                {node.children?.map((child) => {
                  const currentEntity = entities.find((entity) => entity.id === node.entityId);
                  const pathLabel = currentEntity?.getNodeDefinition(child?.modelPath).path;
                  const label = pathLabel?.trim() ? (
                    pathLabel
                  ) : (
                    <span className="rest-tree__label-unspecified">not specified</span>
                  );
                  const childId = getNodeId(child.entityId, child.modelPath);
                  return (
                    <TreeNode
                      key={childId}
                      id={childId}
                      label={label}
                      renderIcon={() => <MethodBadge type={child.type} />}
                      onSelect={() => {
                        onSelect({ entityId: child.entityId, modelPath: child.modelPath });
                      }}
                    />
                  );
                })}
              </TreeNode>
            );
          })}
        </TreeView>
      </div>

      {contextMenuState && (
        <Menu
          key={`${contextMenuState.nodeId}:${contextMenuState.x}:${contextMenuState.y}`}
          ref={contextMenuRef}
          label="REST tree node actions"
          open
          x={contextMenuState.x}
          y={contextMenuState.y}
          onClose={closeContextMenu}
        >
          <MenuItem kind="danger" label="Delete" renderIcon={TrashCan} onClick={onDelete} />
        </Menu>
      )}
    </>
  );
};
