import { useCallback, useContext, useMemo, useRef } from 'react';

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
  const groupedEntities = useRef<BaseVisualEntityDefinition>(camelResource.getCanvasEntityList());

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
      commonEntities: groupedEntities.current.common,
      groupedEntities: groupedEntities.current.groups,
      createEntity,
    }),
    [createEntity],
  );

  return result;
};
