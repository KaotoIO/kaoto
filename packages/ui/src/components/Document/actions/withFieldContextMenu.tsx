import { ComponentType, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DocumentTreeNode } from '../../../models/datamapper/document-tree-node';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { FieldContextMenu, MenuGroup } from './FieldContextMenu';
import { useAbstractFieldMenu } from './FieldContextMenu/useAbstractFieldMenu';
import { useChoiceContextMenu } from './FieldContextMenu/useChoiceContextMenu';
import { useFieldOverrideMenu } from './FieldContextMenu/useFieldOverrideMenu';

type WithTreeNode = {
  treeNode: DocumentTreeNode;
  isReadOnly?: boolean;
};
/**
 * HOC that adds a field override context menu to a document node component.
 *
 * Injects an `onContextMenu` prop into the wrapped component. The component
 * only needs to forward it to its container element — no context menu logic inside.
 *
 * @example
 * ```tsx
 * export const SourceDocumentNodeWithContextMenu = withFieldContextMenu(SourceDocumentNode);
 * ```
 */
export function withFieldContextMenu<P extends WithTreeNode>(
  Component: ComponentType<P & { onContextMenu?: (event: MouseEvent) => void }>,
) {
  const WithContextMenu = (props: P) => {
    const { treeNode, isReadOnly } = props;

    const nodeData = treeNode.nodeData;
    const field = VisualizationUtilService.getField(nodeData);
    const choice = useChoiceContextMenu(nodeData);
    const override = useFieldOverrideMenu(nodeData);
    const abstract = useAbstractFieldMenu(nodeData);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    useEffect(() => {
      if (!isMenuOpen) return;

      const handleDismiss = (e: globalThis.MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setIsMenuOpen(false);
        }
      };
      const handleEscape = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') setIsMenuOpen(false);
      };

      document.addEventListener('mousedown', handleDismiss);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleDismiss);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isMenuOpen]);

    const handleContextMenu = useCallback(
      (event: MouseEvent) => {
        if (!field || isReadOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuPosition({ x: event.clientX, y: event.clientY });
        setIsMenuOpen(true);
      },
      [field, isReadOnly],
    );

    const menuGroups = useMemo(
      (): MenuGroup[] =>
        [...choice.groups, ...override.groups, ...abstract.groups].filter((group) => group.actions.length > 0),
      [choice.groups, override.groups, abstract.groups],
    );

    return (
      <>
        <Component {...props} onContextMenu={handleContextMenu} />

        {isMenuOpen && field && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
              zIndex: 1000,
            }}
          >
            <FieldContextMenu groups={menuGroups} onClose={closeMenu} />
          </div>
        )}

        {choice.modals}
        {override.modals}
        {abstract.modals}
      </>
    );
  };

  WithContextMenu.displayName = `WithContextMenu(${Component.displayName || Component.name || 'Component'})`;
  return WithContextMenu;
}
