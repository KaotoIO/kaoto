import './FieldContextMenu.scss';

import { Divider, Menu, MenuContent, MenuItem, MenuList } from '@patternfly/react-core';
import { Fragment, FunctionComponent, ReactNode } from 'react';

export interface MenuAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  testId?: string;
}

export interface MenuGroup {
  actions: MenuAction[];
}

export interface IFieldContextMenuProps {
  groups: MenuGroup[];
  onClose?: () => void;
}

export const FieldContextMenu: FunctionComponent<IFieldContextMenuProps> = ({ groups, onClose }) => {
  const nonEmptyGroups = groups.filter((g) => g.actions.length > 0);

  return (
    <Menu className="field-context-menu">
      <MenuContent>
        <MenuList>
          {nonEmptyGroups.map((group, groupIndex) => (
            <Fragment key={group.actions[0]?.testId ?? group.actions[0]?.label ?? groupIndex}>
              {groupIndex > 0 && <Divider />}
              {group.actions.map((action) => (
                <MenuItem
                  key={action.testId ?? action.label}
                  onClick={() => {
                    action.onClick();
                    onClose?.();
                  }}
                  icon={action.icon}
                  data-testid={action.testId}
                >
                  {action.label}
                </MenuItem>
              ))}
            </Fragment>
          ))}
        </MenuList>
      </MenuContent>
    </Menu>
  );
};
