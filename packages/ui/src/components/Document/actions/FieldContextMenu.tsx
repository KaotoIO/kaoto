import './FieldContextMenu.scss';

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
    <Menu className="field-context-menu">
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
