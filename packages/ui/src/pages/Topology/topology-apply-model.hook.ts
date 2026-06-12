import { Controller, Dimensions, isNode, Model, Node } from '@patternfly/react-topology';
import { useEffect } from 'react';

import { CanvasDefaults } from '../../components/Visualization/Canvas/canvas.defaults';

const FIT_PADDING = 80;

/**
 * Synchronizes the topology controller with the model: replaces the model,
 * collapses every top-level group (so each route shows as a single node),
 * triggers a layout pass and fits the result to the viewport. The fit() runs
 * inside a requestAnimationFrame so the layout has a chance to settle before
 * we measure; the RAF handle is cleaned up on re-run/unmount.
 */
export const useApplyTopologyModel = (controller: Controller, model: Model, topLevelGroupIds: string[]): void => {
  useEffect(() => {
    controller.fromModel(model, false);

    topLevelGroupIds.forEach((id) => {
      const element = controller.getNodeById(id);
      if (element && isNode(element)) {
        const node = element as Node;
        node.setCollapsed(true);
        node.setDimensions(new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT));
      }
    });

    controller.getGraph().layout();
    const fitHandle = requestAnimationFrame(() => {
      controller.getGraph().fit(FIT_PADDING);
    });
    return () => cancelAnimationFrame(fitHandle);
  }, [controller, model, topLevelGroupIds]);
};
