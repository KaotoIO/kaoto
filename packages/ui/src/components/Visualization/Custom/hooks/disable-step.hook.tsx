import { setValue } from '@kaoto/forms';
import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useDisableStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const isDisabled = !!vizNode.getNodeDefinition()?.disabled;

  const onToggleDisableNode = useCallback(() => {
    const newModel = vizNode.getNodeDefinition() || {};
    setValue(newModel, 'disabled', !isDisabled);
    vizNode.updateModel(newModel);

    entitiesContext?.updateEntitiesFromCamelResource();
  }, [entitiesContext, isDisabled, vizNode]);

  const value = useMemo(
    () => ({
      onToggleDisableNode,
      isDisabled,
    }),
    [isDisabled, onToggleDisableNode],
  );

  return value;
};
