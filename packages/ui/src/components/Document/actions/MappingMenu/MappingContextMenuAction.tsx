import { AddAlt, OverflowMenuVertical } from '@carbon/icons-react';
import {
  ActionListItem,
  Menu,
  MenuContainer,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
} from '@patternfly/react-core';
import { Fragment, FunctionComponent, MouseEvent, useCallback, useMemo, useRef } from 'react';

import { MappingItem } from '../../../../models/datamapper/mapping';
import {
  IMappingActionCallbacks,
  IMappingContextMenuAction,
  MappingActionGroup,
} from '../../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../../models/popper-default';
import { MappingActionRegistryService } from '../../../../services/visualization/mapping-action-registry.service';
import { useDocumentTreeStore } from '../../../../store/document-tree.store';
import { useMappingActionModals } from './useMappingActionModals';

type MappingContextMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

type MappingContextMenuItemsProps = {
  nodeData: TargetNodeData;
  onSelect: (item: IMappingContextMenuAction, event?: MouseEvent) => void;
};

/**
 * The menu's entries. The popper mounts them only while the menu is shown, including its close
 * transition, so the registry's checks — among them the source lookup of "Add optional guard" — run
 * once per opening instead of on every render of every row, and a closing menu keeps its entries.
 * Selection is handled here too, since the entries exist only while this component is mounted.
 */
const MappingContextMenuItems: FunctionComponent<MappingContextMenuItemsProps> = ({ nodeData, onSelect }) => {
  const { ungrouped, groups } = useMemo(() => {
    const ungroupedItems: IMappingContextMenuAction[] = [];
    const groupMap = new Map<MappingActionGroup, IMappingContextMenuAction[]>();
    for (const item of MappingActionRegistryService.getMappingContextMenuItems(nodeData)) {
      if (item.group) {
        const existing = groupMap.get(item.group);
        if (existing) {
          existing.push(item);
        } else {
          groupMap.set(item.group, [item]);
        }
      } else {
        ungroupedItems.push(item);
      }
    }
    return { ungrouped: ungroupedItems, groups: groupMap };
  }, [nodeData]);

  const renderItem = (item: IMappingContextMenuAction) => (
    <MenuItem
      key={item.key}
      itemId={item.key}
      isDisabled={item.isDisabled?.(nodeData)}
      data-testid={item.testId}
      onClick={(event?: MouseEvent) => {
        onSelect(item, event);
      }}
    >
      {item.getLabel(nodeData)}
    </MenuItem>
  );

  return (
    <MenuList>
      {ungrouped.map(renderItem)}

      {[...groups.entries()].map(([group, groupItems]) => (
        <MenuItem
          key={group}
          data-testid={`transformation-actions-group-${group}`}
          flyoutMenu={
            <Menu>
              <MenuContent>
                <MenuList>{groupItems.map(renderItem)}</MenuList>
              </MenuContent>
            </Menu>
          }
        >
          {group}
        </MenuItem>
      ))}
    </MenuList>
  );
};

export const MappingContextMenuAction: FunctionComponent<MappingContextMenuProps> = ({
  dropdownLabel,
  nodeData,
  onUpdate,
}) => {
  const isActionMenuOpen = useDocumentTreeStore((state) => state.openMappingMenuId === nodeData.id);
  const setOpenMappingMenuId = useDocumentTreeStore((state) => state.setOpenMappingMenuId);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  const onSelectItem = useCallback(
    (item: IMappingContextMenuAction, event?: MouseEvent) => {
      event?.stopPropagation();
      item.apply(nodeData, callbacks);
      setOpenMappingMenuId(null);
    },
    [nodeData, callbacks, setOpenMappingMenuId],
  );

  const onToggleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      setOpenMappingMenuId(isActionMenuOpen ? null : nodeData.id);
    },
    [isActionMenuOpen, nodeData.id, setOpenMappingMenuId],
  );

  return (
    <>
      <ActionListItem key="transformation-actions">
        <MenuContainer
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen) => {
            setOpenMappingMenuId(isOpen ? nodeData.id : null);
          }}
          menu={
            <Menu ref={menuRef} containsFlyout>
              <MenuContent>
                <MappingContextMenuItems nodeData={nodeData} onSelect={onSelectItem} />
              </MenuContent>
            </Menu>
          }
          menuRef={menuRef}
          toggle={
            <MenuToggle
              icon={dropdownLabel ? <AddAlt /> : <OverflowMenuVertical />}
              ref={toggleRef}
              onClick={onToggleClick}
              variant={dropdownLabel ? 'secondary' : 'plain'}
              isExpanded={isActionMenuOpen}
              aria-label="Transformation Action list"
              data-testid="transformation-actions-menu-toggle"
            >
              {dropdownLabel}
            </MenuToggle>
          }
          toggleRef={toggleRef}
          popperProps={{ ...DEFAULT_POPPER_PROPS, minWidth: '0', zIndex: 100 }}
        />
      </ActionListItem>

      {modalActions.map((action) => (
        <Fragment key={action.kind}>{action.render()}</Fragment>
      ))}
    </>
  );
};
