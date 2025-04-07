import { FunctionComponent, useState } from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon, PortIcon, TimesIcon } from '@patternfly/react-icons';
import { useFieldValue } from '../hooks/field-value';

export interface FieldActionsProps {
  propName: string;
  clearAriaLabel: string;
  onRemove: () => void;
}

export const FieldActions: FunctionComponent<FieldActionsProps> = ({ propName, clearAriaLabel, onRemove }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { value, wrapValueWithRaw } = useFieldValue(propName);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, _value: string | number | undefined) => {
    setIsOpen(false);
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          data-testid={`${propName}__field-actions`}
          aria-label={`${propName}__field-actions`}
          variant="plain"
          onClick={onToggleClick}
          isExpanded={isOpen}
          icon={<EllipsisVIcon />}
        />
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList>
        <DropdownItem
          onClick={onRemove}
          data-testid={`${propName}__clear`}
          aria-label={clearAriaLabel}
          title={clearAriaLabel}
          icon={<TimesIcon />}
        >
          Clear
        </DropdownItem>
        <DropdownItem
          onClick={wrapValueWithRaw}
          data-testid={`${propName}__toRaw`}
          disabled={value === ''}
          icon={<PortIcon />}
        >
          Raw
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};
