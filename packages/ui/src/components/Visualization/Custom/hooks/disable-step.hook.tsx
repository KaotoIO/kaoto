import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { setValue } from '@kaoto/forms';

export const useDisableStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const isDisabled = !!vizNode.getComponentSchema()?.definition?.disabled;

  const onToggleDisableNode = useCallback(() => {
    const newModel = vizNode.getComponentSchema()?.definition || {};
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
