import { Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon, PortIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useState } from 'react';
import { DEFAULT_POPPER_PROPS } from '../../../../../models/popper-default';

export interface FieldActionsProps {
  propName: string;
  clearAriaLabel: string;
  toggleRawAriaLabel?: string;
  toggleRawValueWrap?: () => void;
  onRemove: () => void;
}

export const FieldActions: FunctionComponent<FieldActionsProps> = ({
  propName,
  clearAriaLabel,
  toggleRawAriaLabel,
  toggleRawValueWrap,
  onRemove,
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
      popperProps={DEFAULT_POPPER_PROPS}
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

        {toggleRawValueWrap && (
          <DropdownItem
            onClick={toggleRawValueWrap}
            data-testid={`${propName}__toRaw`}
            aria-label={toggleRawAriaLabel}
            title={toggleRawAriaLabel}
            icon={<PortIcon />}
          >
            Raw
          </DropdownItem>
        )}
      </DropdownList>
    </Dropdown>
  );
};
