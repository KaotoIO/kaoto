import { useVisualizationController } from '@patternfly/react-topology';
import { useCallback, useContext, useMemo } from 'react';

import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisualizationNodesFromGraph } from '../../../../utils';
import { setValue } from '../../../../utils/set-value';

export const useEnableAllSteps = () => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();
  const disabledNodes = useMemo(() => {
    return getVisualizationNodesFromGraph(controller.getGraph(), (node) => {
      return node.getNodeDefinition()?.disabled;
    });
  }, [controller]);
  const areMultipleStepsDisabled = disabledNodes.length > 1;

  const onEnableAllSteps = useCallback(async () => {
    if (!entitiesContext?.camelResource || entitiesContext.isLoading) return;

    disabledNodes.forEach((node) => {
      const newModel = node.getNodeDefinition() || {};
      setValue(newModel, 'disabled', false);
      node.updateModel(newModel);
    });

    await entitiesContext.updateEntitiesFromCamelResource();
  }, [disabledNodes, entitiesContext]);

  const value = useMemo(
    () => ({
      onEnableAllSteps,
      areMultipleStepsDisabled,
    }),
    [areMultipleStepsDisabled, onEnableAllSteps],
  );

  return value;
};
