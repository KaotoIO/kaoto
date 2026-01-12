import { useCallback, useContext, useMemo, useRef } from 'react';

import { BaseVisualCamelEntityDefinition, BaseVisualCamelEntityDefinitionItem } from '../models/camel/camel-resource';
import { EntityType } from '../models/camel/entities';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { usePasteEntity } from './usePasteEntity';

export interface CanvasEntities {
  commonEntities: BaseVisualCamelEntityDefinitionItem[];
  groupedEntities: Record<string, BaseVisualCamelEntityDefinitionItem[]>;
  createEntity: (entityType: EntityType) => void;
  canPasteEntity: boolean;
  pasteEntity: () => Promise<void>;
}

export const useCanvasEntities = (): CanvasEntities => {
  const { camelResource, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const groupedEntities = useRef<BaseVisualCamelEntityDefinition>(camelResource.getCanvasEntityList());
  const { canPaste, pasteEntity } = usePasteEntity();

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
      canPasteEntity: canPaste,
      pasteEntity,
    }),
    [canPaste, createEntity, pasteEntity],
  );

  return result;
};
