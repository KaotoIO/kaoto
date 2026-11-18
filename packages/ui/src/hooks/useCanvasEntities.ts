import { useCallback, useContext, useMemo } from 'react';

import { EntityType } from '../models/entities';
import { BaseVisualEntityDefinition, BaseVisualEntityDefinitionItem } from '../models/kaoto-resource';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { useEntityContext } from './useEntityContext/useEntityContext';

export interface CanvasEntities {
  commonEntities: BaseVisualEntityDefinitionItem[];
  groupedEntities: Record<string, BaseVisualEntityDefinitionItem[]>;
  createEntity: (entityType: EntityType) => void;
}

export const useCanvasEntities = (): CanvasEntities => {
  const { camelResource, updateEntitiesFromCamelResource } = useEntityContext();
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  // Read on every render: the canvas and its toolbar mount before the resource is initialized and stay mounted, so a
  // list read once would stay empty. The resource caches the list, so this is cheap and stable once initialized.
  const groupedEntities: BaseVisualEntityDefinition = camelResource.getCanvasEntityList();

  const createEntity = useCallback(
    (entityType: EntityType) => {
      const newId = camelResource.addNewEntity(entityType);
      visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
      updateEntitiesFromCamelResource();
    },
    [camelResource, updateEntitiesFromCamelResource, visibleFlowsContext.visualFlowsApi],
  );

  const result = useMemo(
    () => ({
      commonEntities: groupedEntities.common,
      groupedEntities: groupedEntities.groups,
      createEntity,
    }),
    [createEntity, groupedEntities],
  );

  return result;
};
