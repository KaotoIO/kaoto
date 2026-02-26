import { FunctionComponent, MouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField } from '../../../models/datamapper/document';
import { TypeOverrideVariant } from '../../../models/datamapper/types';
import { FieldContextMenu } from './FieldContextMenu';
import { FieldTypeOverride, revertTypeOverride } from './FieldTypeOverride';

type FieldOverrideContextMenuProps = {
  field: IField | undefined;
  isReadOnly?: boolean;
  onUpdate: () => void;
  children: (props: { onContextMenu: (event: MouseEvent) => void }) => ReactNode;
};

/**
 * Self-contained context menu for field type override operations.
 * Manages menu visibility, positioning, outside-click dismissal,
 * and the type override modal lifecycle.
 */
export const FieldOverrideContextMenu: FunctionComponent<FieldOverrideContextMenuProps> = ({
  field,
  isReadOnly,
  onUpdate,
  children,
}) => {
  const { mappingTree, updateDocument } = useDataMapper();

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const hasTypeOverride = !!field && field.typeOverride !== TypeOverrideVariant.NONE;

  useEffect(() => {
    if (!showContextMenu) return;

    const handleDocumentMouseDown = (e: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    const handleDocumentKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [showContextMenu]);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (!field || isReadOnly) return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    },
    [field, isReadOnly],
  );

  const handleOverrideType = useCallback(() => {
    setIsTypeOverrideModalOpen(true);
  }, []);

  const handleResetOverride = useCallback(() => {
    if (field) {
      revertTypeOverride(field, mappingTree.namespaceMap, updateDocument);
      onUpdate();
    }
  }, [field, mappingTree.namespaceMap, updateDocument, onUpdate]);

  return (
    <>
      {children({ onContextMenu: handleContextMenu })}

      {showContextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000,
          }}
        >
          <FieldContextMenu
            hasOverride={hasTypeOverride}
            onOverrideType={handleOverrideType}
            onResetOverride={handleResetOverride}
            onClose={() => setShowContextMenu(false)}
          />
        </div>
      )}

      {isTypeOverrideModalOpen && field && (
        <FieldTypeOverride
          isOpen={isTypeOverrideModalOpen}
          field={field}
          onComplete={onUpdate}
          onClose={() => setIsTypeOverrideModalOpen(false)}
        />
      )}
    </>
  );
};
