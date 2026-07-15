import './RestTree.scss';

import { TrashCan } from '@carbon/icons-react';
import { Menu, MenuItem, TreeNode, TreeView, useContextMenu } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, useEffect, useRef, useState } from 'react';

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
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLUListElement>(null);
  const contextMenuProps = useContextMenu(contextMenuTriggerRef);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string>();

  useEffect(() => {
    if (!contextMenuProps.open) return;

    // Menu closes on blur, but pointer events on non-focusable areas do not always move focus.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !contextMenuRef.current?.contains(event.target)) {
        contextMenuProps.onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [contextMenuProps]);

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
        ref={contextMenuTriggerRef}
        className="rest-tree"
        onContextMenuCapture={(event) => {
          if (!(event.target instanceof Element)) {
            event.stopPropagation();
            return;
          }

          const treeItem = event.target.closest('[role="treeitem"]');
          if (!(treeItem instanceof HTMLElement) || !event.currentTarget.contains(treeItem)) {
            event.stopPropagation();
            return;
          }

          const selection = selectionsByNodeId.get(treeItem.id);
          if (!selection) {
            event.stopPropagation();
            return;
          }

          if (selection.entityId !== selected?.entityId || selection.modelPath !== selected.modelPath) {
            onSelect(selection);
          }
          treeItem.focus();
          setContextMenuNodeId(treeItem.id);
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

      {contextMenuNodeId && (
        <Menu
          key={`${contextMenuNodeId}:${contextMenuProps.x}:${contextMenuProps.y}`}
          {...contextMenuProps}
          ref={contextMenuRef}
          label="REST tree node actions"
        >
          <MenuItem kind="danger" label="Delete" renderIcon={TrashCan} onClick={onDelete} />
        </Menu>
      )}
    </>
  );
};
