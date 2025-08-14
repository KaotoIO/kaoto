import { Menu, MenuContainer, MenuContent, MenuItem, MenuList, MenuToggle } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactElement, useCallback, useRef, useState } from 'react';
import { useCanvasEntities } from '../../../../hooks/useCanvasEntities';
import { EntityType } from '../../../../models/camel/entities';
import './NewEntity.scss';

export const NewEntity: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { commonEntities, groupedEntities, createEntity } = useCanvasEntities();

  const onSelect = useCallback(
    (event: unknown, entityType: string | number | undefined) => {
      // Prevent event bubbling to avoid context menu auto-close
      if (event && typeof event === 'object' && 'stopPropagation' in event) {
        (event as Event).stopPropagation();
      }

      if (!entityType) {
        return;
      }

      createEntity(entityType as EntityType);
      setIsOpen(false);
    },
    [createEntity],
  );

  const getMenuItem = useCallback(
    (
      entity:
        | { title: string; description?: string; name: EntityType }
        | { title: string; description?: string; key: string },
      flyoutMenu?: ReactElement,
    ) => {
      const name = 'name' in entity ? entity.name : entity.key;
      return (
        <MenuItem
          key={`new-entity-${name}`}
          data-testid={`new-entity-${name}`}
          itemId={name}
          description={
            <span className="pf-v6-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
              {entity.description}
            </span>
          }
          flyoutMenu={flyoutMenu}
        >
          {entity.title}
        </MenuItem>
      );
    },
    [],
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      menu={
        <Menu ref={menuRef} containsFlyout onSelect={onSelect}>
          <MenuContent>
            <MenuList>
              {commonEntities.map((entityDef) => getMenuItem(entityDef))}

              {Object.entries(groupedEntities).map(([group, entities]) => {
                const flyoutMenu = (
                  <Menu className="entities-menu__submenu" onSelect={onSelect}>
                    <MenuContent>
                      <MenuList>{entities.map((entityDef) => getMenuItem(entityDef))}</MenuList>
                    </MenuContent>
                  </Menu>
                );

                return getMenuItem({ key: group, title: group }, flyoutMenu);
              })}
            </MenuList>
          </MenuContent>
        </Menu>
      }
      menuRef={menuRef}
      toggle={
        <MenuToggle
          data-testid="new-entity-list-dropdown"
          ref={toggleRef}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          isExpanded={isOpen}
        >
          <PlusIcon />
          <span className="pf-v6-u-m-sm">New</span>
        </MenuToggle>
      }
      toggleRef={toggleRef}
    />
  );
};
