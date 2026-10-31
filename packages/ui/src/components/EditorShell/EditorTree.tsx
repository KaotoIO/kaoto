import './EditorTree.scss';

import { TrashCan } from '@carbon/icons-react';
import { FeatureFlags, Menu, MenuItem, TreeView, useContextMenu } from '@carbon/react';
import { FunctionComponent, MouseEvent, PropsWithChildren, useEffect, useRef, useState } from 'react';

export interface EditorTreeProps extends PropsWithChildren {
  /** TreeView label, also the accessible name of the tree */
  label: string;
  /** Id of the active TreeNode */
  activeId?: string;
  /** Accessible label of the context menu */
  menuLabel: string;
  /**
   * Called on right-click of a `[role="treeitem"]` inside the tree. The editor selects the row (if it is
   * not selected yet) and returns true, or returns false when the item is unknown. On false the event
   * is stopped and no menu opens.
   */
  resolveSelection: (treeItem: HTMLElement) => boolean;
  onDelete: () => void;
  /** data-testid of the Delete item in the context menu */
  deleteTestId?: string;
  /**
   * Wraps the tree in `FeatureFlags enableTreeviewControllable` so `activeId` follows prop changes
   * instead of being only an initial value. Default: true.
   */
  controllable?: boolean;
  /** Class name of the wrapper element */
  className?: string;
}

/**
 * Carbon TreeView with a right-click context menu offering "Delete".
 * The editor only supplies the tree nodes and how a DOM tree item maps to its own selection.
 */
export const EditorTree: FunctionComponent<EditorTreeProps> = ({
  label,
  activeId,
  menuLabel,
  resolveSelection,
  onDelete,
  deleteTestId,
  controllable = true,
  className,
  children,
}) => {
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

  const handleContextMenuCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) {
      event.stopPropagation();
      return;
    }

    const treeItem = event.target.closest('[role="treeitem"]');
    if (!(treeItem instanceof HTMLElement) || !event.currentTarget.contains(treeItem) || !resolveSelection(treeItem)) {
      event.stopPropagation();
      return;
    }

    treeItem.focus();
    setContextMenuNodeId(treeItem.id);
  };

  /* active prop on TreeView highlights the node whose id matches — TreeNode has no isActive prop.
     enableTreeviewControllable makes `active` follow prop changes instead of being only an initial value. */
  const tree = (
    <TreeView label={label} active={activeId}>
      {children}
    </TreeView>
  );

  return (
    <>
      <div
        ref={contextMenuTriggerRef}
        className={['editor-tree', className].filter(Boolean).join(' ')}
        onContextMenuCapture={handleContextMenuCapture}
      >
        {controllable ? <FeatureFlags enableTreeviewControllable>{tree}</FeatureFlags> : tree}
      </div>

      {contextMenuNodeId && (
        <Menu
          key={`${contextMenuNodeId}:${contextMenuProps.x}:${contextMenuProps.y}`}
          {...contextMenuProps}
          ref={contextMenuRef}
          label={menuLabel}
        >
          <MenuItem kind="danger" label="Delete" renderIcon={TrashCan} onClick={onDelete} data-testid={deleteTestId} />
        </Menu>
      )}
    </>
  );
};
