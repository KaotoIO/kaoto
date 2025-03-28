import { Children, FunctionComponent, isValidElement, ReactElement, useState } from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';

function isDropdownItem(element: React.ReactNode): element is ReactElement<typeof DropdownItem> {
  return (
    isValidElement(element) &&
    (element.type === DropdownItem || (typeof element.type === 'object' && element.type === 'DropdownItem'))
  );
}

export interface FieldActionsProps {
  children: ReactElement<typeof DropdownItem> | ReactElement<typeof DropdownItem>[];
}

export const FieldActions: FunctionComponent<FieldActionsProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, _value: string | number | undefined) => {
    setIsOpen(false);
  };

  // Validate that all children are DropdownItem components
  const validChildren = Children.toArray(children).every(isDropdownItem);
  if (!validChildren) {
    console.warn('FieldActions: All children must be DropdownItem components');
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="kebab dropdown toggle"
          variant="plain"
          onClick={onToggleClick}
          isExpanded={isOpen}
          icon={<EllipsisVIcon />}
        />
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList>{children}</DropdownList>
    </Dropdown>
  );
};
