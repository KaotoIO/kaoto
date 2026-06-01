import { useCallback, useContext, useMemo } from 'react';

import { EntityType } from '../models/entities';
import { BaseVisualEntityDefinitionItem } from '../models/kaoto-resource';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';

export interface CanvasEntities {
  commonEntities: BaseVisualEntityDefinitionItem[];
  groupedEntities: Record<string, BaseVisualEntityDefinitionItem[]>;
  createEntity: (entityType: EntityType) => void | Promise<void>;
}

export const useCanvasEntities = (): CanvasEntities => {
  const { camelResource, isLoading, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const groupedEntities = useMemo(
    () => camelResource?.getCanvasEntityList() ?? { common: [], groups: {} },
    [camelResource],
  );

  const createEntity = useCallback(
    (entityType: EntityType) => {
      if (!camelResource || isLoading) return;

      const newId = camelResource.addNewEntity(entityType);
      visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
      updateEntitiesFromCamelResource();
    },
    [camelResource, isLoading, updateEntitiesFromCamelResource, visibleFlowsContext.visualFlowsApi],
  );

  return useMemo(
    () => ({
      commonEntities: groupedEntities.common,
      groupedEntities: groupedEntities.groups,
      createEntity,
    }),
    [groupedEntities, createEntity],
  );
};
