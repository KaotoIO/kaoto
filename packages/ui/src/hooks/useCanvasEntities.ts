import { useCallback, useContext, useMemo } from 'react';

import { EntityType } from '../models/entities';
import { BaseVisualEntityDefinitionItem } from '../models/kaoto-resource';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { useEntityContext } from './useEntityContext/useEntityContext';

export interface CanvasEntities {
  commonEntities: BaseVisualEntityDefinitionItem[];
  groupedEntities: Record<string, BaseVisualEntityDefinitionItem[]>;
  createEntity: (entityType: EntityType) => void;
}

export const useCanvasEntities = (): CanvasEntities => {
  const { camelResource, entities, updateEntitiesFromCamelResource } = useEntityContext();
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- entities signals that initialize() resolved the list
  const groupedEntities = useMemo(() => camelResource.getCanvasEntityList(), [camelResource, entities]);

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
