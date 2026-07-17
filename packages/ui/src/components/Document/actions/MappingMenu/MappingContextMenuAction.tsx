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
import { Fragment, FunctionComponent, MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { MappingItem } from '../../../../models/datamapper/mapping';
import {
  IMappingActionCallbacks,
  IMappingContextMenuAction,
  MappingActionGroup,
} from '../../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../../models/popper-default';
import { MappingActionRegistryService } from '../../../../services/visualization/mapping-action-registry.service';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuItems = useMemo(() => MappingActionRegistryService.getMappingContextMenuItems(nodeData), [nodeData]);

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

  const { ungrouped, groups } = useMemo(() => {
    const ungroupedItems: IMappingContextMenuAction[] = [];
    const groupMap = new Map<MappingActionGroup, IMappingContextMenuAction[]>();
    for (const item of menuItems) {
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
  }, [menuItems]);

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, itemId: string | number | undefined) => {
      event?.stopPropagation();
      const item = menuItems.find((mi) => mi.key === itemId);
      if (item) {
        item.apply(nodeData, callbacks);
        setIsActionMenuOpen(false);
      }
    },
    [menuItems, nodeData, callbacks],
  );

  const onToggleClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    setIsActionMenuOpen((prev) => !prev);
  }, []);

  return (
    <>
      <ActionListItem key="transformation-actions">
        <MenuContainer
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen) => {
            setIsActionMenuOpen(isOpen);
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
