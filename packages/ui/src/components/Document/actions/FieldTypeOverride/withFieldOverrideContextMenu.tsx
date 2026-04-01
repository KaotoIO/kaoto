import { ComponentType, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { DocumentTreeNode } from '../../../../models/datamapper/document-tree-node';
import { TypeOverrideVariant } from '../../../../models/datamapper/types';
import { VisualizationService } from '../../../../services/visualization.service';
import { FieldContextMenu } from '../FieldContextMenu';
import { FieldTypeOverride } from './FieldTypeOverride';
import { revertTypeOverride } from './revert-type-override';

type WithTreeNode = {
  treeNode: DocumentTreeNode;
  isReadOnly?: boolean;
};

/**
 * HOC that adds a field type override context menu to a document node component.
 *
 * Injects an `onContextMenu` prop into the wrapped component. The component
 * only needs to forward it to its container element — no context menu logic inside.
 *
 * @example
 * ```tsx
 * export const SourceDocumentNodeWithContextMenu = withFieldOverrideContextMenu(SourceDocumentNode);
 * ```
 */
export function withFieldOverrideContextMenu<P extends WithTreeNode>(
  Component: ComponentType<P & { onContextMenu?: (event: MouseEvent) => void }>,
) {
  const WithContextMenu = (props: P) => {
    const { treeNode, isReadOnly } = props;
    const { mappingTree, updateDocument, refreshMappingTree } = useDataMapper();

    const field = VisualizationService.getField(treeNode.nodeData);
    const hasTypeOverride = !!field && field.typeOverride !== TypeOverrideVariant.NONE;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const handleOverrideType = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleResetOverride = useCallback(() => {
      if (field) {
        revertTypeOverride(field, mappingTree.namespaceMap, updateDocument);
        refreshMappingTree();
      }
    }, [field, mappingTree.namespaceMap, updateDocument, refreshMappingTree]);

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
            <FieldContextMenu
              hasOverride={hasTypeOverride}
              onOverrideType={handleOverrideType}
              onResetOverride={handleResetOverride}
              onClose={() => setIsMenuOpen(false)}
            />
          </div>
        )}

        {isModalOpen && field && (
          <FieldTypeOverride
            isOpen={isModalOpen}
            field={field}
            onComplete={refreshMappingTree}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </>
    );
  };

  WithContextMenu.displayName = `WithContextMenu(${Component.displayName || Component.name || 'Component'})`;
  return WithContextMenu;
}
