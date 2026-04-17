import { Divider, Menu, MenuContent, MenuItem, MenuList } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

export interface IFieldContextMenuProps {
  fieldName: string;
  hasOverride?: boolean;
  isSafeOverride?: boolean;
  isAnyType?: boolean;
  position?: { x: number; y: number };
  onOverrideType?: () => void;
  onForceOverrideType?: () => void;
  onViewOriginalType?: () => void;
  onResetOverride?: () => void;
  onClose?: () => void;
}

export const FieldContextMenu: FunctionComponent<IFieldContextMenuProps> = ({
  hasOverride = false,
  isSafeOverride = true,
  isAnyType = false,
  onOverrideType,
  onForceOverrideType,
  onViewOriginalType,
  onResetOverride,
  onClose,
}) => {
  const handleOverrideType = () => {
    onOverrideType?.();
    onClose?.();
  };

  const handleForceOverrideType = () => {
    onForceOverrideType?.();
    onClose?.();
  };

  const handleViewOriginalType = () => {
    onViewOriginalType?.();
    onClose?.();
  };

  const handleResetOverride = () => {
    onResetOverride?.();
    onClose?.();
  };

  return (
    <Menu
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        border: '1px solid #d2d2d2',
        borderRadius: '4px',
        backgroundColor: '#fff',
      }}
    >
      <MenuContent>
        <MenuList>
          {isSafeOverride && <MenuItem onClick={handleOverrideType}>Override Type...</MenuItem>}

          {!isAnyType && (
            <MenuItem
              onClick={handleForceOverrideType}
              icon={<span style={{ color: 'var(--pf-v6-global--warning-color--100)' }}>⚠️</span>}
            >
              Force Override...
            </MenuItem>
          )}

          {hasOverride && <MenuItem onClick={handleViewOriginalType}>View Original Type</MenuItem>}

          {hasOverride && (
            <>
              <Divider />
              <MenuItem onClick={handleResetOverride}>Reset Override</MenuItem>
            </>
          )}
        </MenuList>
      </MenuContent>
    </Menu>
  );
};
