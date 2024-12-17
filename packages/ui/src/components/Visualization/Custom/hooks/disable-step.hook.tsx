import { useCallback, useMemo } from 'react';
import { useVizNodeModel } from '../../../../hooks';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';

export const useDisableStep = (vizNode: IVisualizationNode) => {
  const { model, updateModel } = useVizNodeModel<{ disabled?: boolean }>(vizNode);
  const isDisabled = !!model.disabled;

  const onToggleDisableNode = useCallback(() => {
    const newModel = { ...model, disabled: !isDisabled };
    updateModel(newModel);
  }, [isDisabled, model, updateModel]);

  const value = useMemo(
    () => ({
      onToggleDisableNode,
      isDisabled,
    }),
    [isDisabled, onToggleDisableNode],
  );

  return value;
};
