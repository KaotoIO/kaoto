import { Divider, Menu, MenuContent, MenuItem, MenuList } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

export interface IFieldContextMenuProps {
  hasOverride?: boolean;
  onOverrideType?: () => void;
  onResetOverride?: () => void;
  onClose?: () => void;
}

export const FieldContextMenu: FunctionComponent<IFieldContextMenuProps> = ({
  hasOverride = false,
  onOverrideType,
  onResetOverride,
  onClose,
}) => {
  const handleOverrideType = () => {
    onOverrideType?.();
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
          <MenuItem onClick={handleOverrideType}>Override Type...</MenuItem>

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
