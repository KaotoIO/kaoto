import { FunctionComponent, MouseEvent, Ref, useCallback, useState } from 'react';
import {
  ActionListGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ChooseItem } from '../../../../models/mapping';
import { MappingService } from '../../../../services/mapping.service';

type ChooseMenuProps = {
  chooseItem: ChooseItem;
  onUpdate: () => void;
};
export const ChooseMenuAction: FunctionComponent<ChooseMenuProps> = ({ chooseItem }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const onToggleActionMenu = useCallback(() => setIsActionMenuOpen(!isActionMenuOpen), [isActionMenuOpen]);
  const otherwiseItem = chooseItem?.otherwise;
  const onSelectAction = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      switch (value) {
        case 'when':
          MappingService.addWhen(chooseItem);
          break;
        case 'otherwise':
          !otherwiseItem && MappingService.addOtherwise(chooseItem);
          break;
      }
      setIsActionMenuOpen(false);
    },
    [chooseItem, otherwiseItem],
  );

  return (
    <ActionListGroup key="transformation-actions">
      <Dropdown
        onSelect={onSelectAction}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={onToggleActionMenu}
            variant="plain"
            isExpanded={isActionMenuOpen}
            aria-label="Transformation Action list"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        isOpen={isActionMenuOpen}
        onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
      >
        <DropdownList>
          <DropdownItem key="when" value="when">
            Add <q>when</q>
          </DropdownItem>
          <DropdownItem key="otherwise" value="otherwise" isDisabled={!!otherwiseItem}>
            Add <q>otherwise</q>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListGroup>
  );
};
