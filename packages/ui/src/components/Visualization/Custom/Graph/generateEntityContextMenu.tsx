import { ContextMenuItem, ContextSubMenuItem } from '@patternfly/react-topology';
import React from 'react';
import { CanvasEntities } from '../../../../hooks/useCanvasEntities';
import './generateEntityContextMenu.scss';

export const generateEntityContextMenu = (entityData: CanvasEntities) => {
  const { commonEntities, groupedEntities, createEntity } = entityData;
  const items: React.ReactElement[] = [];

  commonEntities.forEach((entity) => {
    items.push(
      <ContextMenuItem
        key={`new-entity-${entity.name}`}
        data-testid={`new-entity-${entity.name}`}
        onClick={() => createEntity(entity.name)}
        description={
          <span className="pf-v6-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
            {entity.description}
          </span>
        }
      >
        {entity.title}
      </ContextMenuItem>,
    );
  });

  // Add grouped entities as submenus
  Object.entries(groupedEntities).forEach(([groupName, entities]) => {
    const subItems = entities.map((entity) => (
      <ContextMenuItem
        key={`new-entity-${entity.name}`}
        data-testid={`new-entity-${entity.name}`}
        onClick={() => createEntity(entity.name)}
        description={
          <span className="pf-v6-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
            {entity.description}
          </span>
        }
      >
        {entity.title}
      </ContextMenuItem>
    ));

    items.push(
      <ContextSubMenuItem key={groupName} label={groupName}>
        {subItems}
      </ContextSubMenuItem>,
    );
  });

  return items;
};
