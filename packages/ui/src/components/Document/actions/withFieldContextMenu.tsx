import { ComponentType, MouseEvent, useCallback, useMemo } from 'react';

import { DocumentTreeNode } from '../../../models/datamapper/document-tree-node';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { FieldContextMenu, MenuGroup } from './FieldContextMenu';
import { useAbstractFieldSubstitutionMenu } from './FieldContextMenu/useAbstractFieldSubstitutionMenu';
import { useChoiceContextMenu } from './FieldContextMenu/useChoiceContextMenu';
import { useContextMenuState } from './FieldContextMenu/useContextMenuState';
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
    const abstractSubstitution = useAbstractFieldSubstitutionMenu(nodeData);

    const { isMenuOpen, menuPosition, menuRef, closeMenu, openMenu } = useContextMenuState();

    const handleContextMenu = useCallback(
      (event: MouseEvent) => {
        if (!field || isReadOnly) return;
        openMenu(event);
      },
      [field, isReadOnly, openMenu],
    );

    const menuGroups = useMemo(
      (): MenuGroup[] =>
        [...choice.groups, ...override.groups, ...abstractSubstitution.groups].filter(
          (group) => group.actions.length > 0,
        ),
      [choice.groups, override.groups, abstractSubstitution.groups],
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
        {abstractSubstitution.modals}
      </>
    );
  };

  WithContextMenu.displayName = `WithContextMenu(${Component.displayName || Component.name || 'Component'})`;
  return WithContextMenu;
}
