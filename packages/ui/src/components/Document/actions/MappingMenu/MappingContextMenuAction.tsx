import {
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { AddCircleOIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Fragment, FunctionComponent, MouseEvent, Ref, useCallback, useMemo, useState } from 'react';

import { MappingItem } from '../../../../models/datamapper/mapping';
import { IMappingActionCallbacks } from '../../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../../models/popper-default';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { useMappingActionModals } from './useMappingActionModals';

type MappingContextMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const MappingContextMenuAction: FunctionComponent<MappingContextMenuProps> = ({
  dropdownLabel,
  nodeData,
  onUpdate,
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const menuItems = useMemo(() => MappingActionService.getMappingContextMenuItems(nodeData), [nodeData]);

  const mappingItem = nodeData.mapping instanceof MappingItem ? nodeData.mapping : undefined;

  const modalActions = useMappingActionModals(mappingItem, onUpdate);

  const callbacks: IMappingActionCallbacks = useMemo(
    () => ({
      onUpdate,
      openModal: (type: string) => {
        modalActions.find((a) => a.kind === type)?.open();
      },
    }),
    [onUpdate, modalActions],
  );

  const onToggleActionMenu = useCallback(
    (event: MouseEvent | undefined) => {
      event?.stopPropagation();
      setIsActionMenuOpen(!isActionMenuOpen);
    },
    [isActionMenuOpen],
  );

  const renderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        icon={dropdownLabel ? <AddCircleOIcon /> : <EllipsisVIcon />}
        ref={toggleRef}
        onClick={onToggleActionMenu}
        variant={dropdownLabel ? 'secondary' : 'plain'}
        isExpanded={isActionMenuOpen}
        aria-label="Transformation Action list"
        data-testid="transformation-actions-menu-toggle"
      >
        {dropdownLabel}
      </MenuToggle>
    ),
    [dropdownLabel, onToggleActionMenu, isActionMenuOpen],
  );

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, value: string | number | undefined) => {
      event?.stopPropagation();
      const item = menuItems.find((mi) => mi.key === value);
      if (item) {
        item.apply(nodeData, callbacks);
        setIsActionMenuOpen(false);
      }
    },
    [menuItems, nodeData, callbacks],
  );

  return (
    <>
      <ActionListItem key="transformation-actions">
        <Dropdown
          onSelect={onSelectAction}
          toggle={renderToggle}
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
          popperProps={DEFAULT_POPPER_PROPS}
          zIndex={100}
        >
          <DropdownList>
            {menuItems.map((item) => (
              <DropdownItem
                key={item.key}
                value={item.key}
                isDisabled={item.isDisabled?.(nodeData)}
                data-testid={item.testId}
              >
                {item.getLabel(nodeData)}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </ActionListItem>

      {modalActions.map((action) => (
        <Fragment key={action.kind}>{action.render()}</Fragment>
      ))}
    </>
  );
};
