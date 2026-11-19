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
  // Per resource, not once per mount: the canvas and its toolbar stay mounted when the resource is replaced
  const groupedEntities = useMemo<BaseVisualEntityDefinition>(
    () => camelResource.getCanvasEntityList(),
    [camelResource],
  );

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
