import {
  ActionListItem,
  Menu,
  MenuContainer,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
} from '@patternfly/react-core';
import { AddCircleOIcon, EllipsisVIcon } from '@patternfly/react-icons';
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

export const MappingContextMenuAction: FunctionComponent<MappingContextMenuProps> = ({
  dropdownLabel,
  nodeData,
  onUpdate,
}) => {
  const isActionMenuOpen = useDocumentTreeStore((state) => state.openMappingMenuId === nodeData.id);
  const setOpenMappingMenuId = useDocumentTreeStore((state) => state.setOpenMappingMenuId);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuItems = MappingActionRegistryService.getMappingContextMenuItems(nodeData);

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

  const ungrouped: IMappingContextMenuAction[] = [];
  const groups = new Map<MappingActionGroup, IMappingContextMenuAction[]>();
  for (const item of menuItems) {
    if (item.group) {
      const existing = groups.get(item.group);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.group, [item]);
      }
    } else {
      ungrouped.push(item);
    }
  }

  const onSelectAction = (event: MouseEvent | undefined, itemId: string | number | undefined) => {
    event?.stopPropagation();
    const item = menuItems.find((mi) => mi.key === itemId);
    if (item) {
      item.apply(nodeData, callbacks);
      setOpenMappingMenuId(null);
    }
  };

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
            <Menu ref={menuRef} containsFlyout onSelect={onSelectAction}>
              <MenuContent>
                <MenuList>
                  {ungrouped.map((item) => (
                    <MenuItem
                      key={item.key}
                      itemId={item.key}
                      isDisabled={item.isDisabled?.(nodeData)}
                      data-testid={item.testId}
                    >
                      {item.getLabel(nodeData)}
                    </MenuItem>
                  ))}

                  {[...groups.entries()].map(([group, groupItems]) => (
                    <MenuItem
                      key={group}
                      data-testid={`transformation-actions-group-${group}`}
                      flyoutMenu={
                        <Menu onSelect={onSelectAction}>
                          <MenuContent>
                            <MenuList>
                              {groupItems.map((item) => (
                                <MenuItem
                                  key={item.key}
                                  itemId={item.key}
                                  isDisabled={item.isDisabled?.(nodeData)}
                                  data-testid={item.testId}
                                >
                                  {item.getLabel(nodeData)}
                                </MenuItem>
                              ))}
                            </MenuList>
                          </MenuContent>
                        </Menu>
                      }
                    >
                      {group}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuContent>
            </Menu>
          }
          menuRef={menuRef}
          toggle={
            <MenuToggle
              icon={dropdownLabel ? <AddCircleOIcon /> : <EllipsisVIcon />}
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
