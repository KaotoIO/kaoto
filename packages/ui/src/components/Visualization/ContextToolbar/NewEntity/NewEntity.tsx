import { Menu, MenuContainer, MenuContent, MenuItem, MenuList, MenuToggle } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactElement, useCallback, useContext, useRef, useState } from 'react';
import { BaseVisualCamelEntityDefinition } from '../../../../models/camel/camel-resource';
import { EntityType } from '../../../../models/camel/entities';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { SELECTION_EVENT, useVisualizationController } from '@patternfly/react-topology';
import { getVisualizationNodesFromGraph } from '../../../../utils';

export const NewEntity: FunctionComponent = () => {
  const { camelResource, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const groupedEntities = useRef<BaseVisualCamelEntityDefinition>(camelResource.getCanvasEntityList());
  const controller = useVisualizationController();

  const onSelect = useCallback(
    (_event: unknown, entityType: string | number | undefined) => {
      if (!entityType) {
        return;
      }

      /**
       * If it's the same DSL as we have in the existing Flows list,
       * we don't need to do anything special, just add a new flow if
       * supported
       */
      const newId = camelResource.addNewEntity(entityType as EntityType);
      setTimeout(() => {
        const result = getVisualizationNodesFromGraph(
          controller.getGraph(),
          (vizNode) => vizNode.data.entity?.id === newId,
        );
        controller.fireEvent(SELECTION_EVENT, [result[0]?.id]);
      }, 300);

      visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
      updateEntitiesFromCamelResource();
      setIsOpen(false);
    },
    [camelResource, updateEntitiesFromCamelResource, visibleFlowsContext.visualFlowsApi],
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
            <span className="pf-v5-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
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
        // TODO: Workaround for flyout menu being scrollable and packed within the toolbar
        <Menu ref={menuRef} style={{ overflowY: 'unset' }} containsFlyout onSelect={onSelect}>
          <MenuContent>
            <MenuList>
              {groupedEntities.current.common.map((entityDef) => getMenuItem(entityDef))}

              {Object.entries(groupedEntities.current.groups).map(([group, entities]) => {
                const flyoutMenu = (
                  <Menu onSelect={onSelect}>
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
          <span className="pf-v5-u-m-sm">New</span>
        </MenuToggle>
      }
      toggleRef={toggleRef}
    />
  );
};
