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
    if (disabledNodes.length > 0) {
      const models = await Promise.all(
        disabledNodes.map(async (node) => (await node.getParsedDefinition()) ?? node.getNodeDefinition() ?? {}),
      );
      models.forEach((newModel, index) => {
        setValue(newModel as Record<string, unknown>, 'disabled', false);
        disabledNodes[index].updateModel(newModel);
      });
    }
    entitiesContext?.updateEntitiesFromCamelResource();
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
