import { useVisualizationController } from '@patternfly/react-topology';
import { useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';

import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisualizationNodesFromGraph } from '../../../../utils';
import { setValue } from '../../../../utils/set-value';

export const useEnableAllSteps = () => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();
  const disabledNodes = getVisualizationNodesFromGraph(controller.getGraph(), (node) => {
    return !!(node.data?.definition as { disabled?: unknown } | undefined)?.disabled;
  });
  const disabledNodesRef = useRef(disabledNodes);
  useLayoutEffect(() => {
    disabledNodesRef.current = disabledNodes;
  });
  const areMultipleStepsDisabled = disabledNodes.length > 1;

  const onEnableAllSteps = useCallback(() => {
    // The shared toolbar survives target changes. Never act on nodes from a replaced graph.
    const currentNodes = new Set(getVisualizationNodesFromGraph(controller.getGraph()));
    const currentDisabledNodes = disabledNodesRef.current.filter((node) => currentNodes.has(node));
    if (currentDisabledNodes.length > 0) {
      currentDisabledNodes.forEach((node) => {
        const newModel = (node.data?.definition as Record<string, unknown>) ?? {};
        setValue(newModel, 'disabled', false);
        node.updateModel(newModel);
      });
    }
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [controller, entitiesContext]);

  const value = useMemo(
    () => ({
      onEnableAllSteps,
      areMultipleStepsDisabled,
    }),
    [areMultipleStepsDisabled, onEnableAllSteps],
  );

  return value;
};
