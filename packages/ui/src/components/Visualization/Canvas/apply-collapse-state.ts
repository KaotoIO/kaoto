import type { Controller } from '@patternfly/react-topology';
import { Dimensions, isNode, Node } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../../models';
import { CanvasDefaults } from './canvas.defaults';
import { COLLAPSE_STATE, CollapseHandlerState } from './collapse-handler-state';

/**
 * Re-applies collapsed state from the controller state to graph nodes.
 * Call this after controller.fromModel() so that previously collapsed groups
 * stay collapsed when the graph is rebuilt.
 */
export function applyCollapseState(controller: Controller): void {
  const collapsedIds = controller.getState<CollapseHandlerState>()[COLLAPSE_STATE];
  if (collapsedIds?.length) {
    collapsedIds.forEach((id) => {
      const node = controller
        .getElements()
        .find((el) => isNode(el) && (el.getData()?.vizNode as IVisualizationNode)?.getNodeDefinition()?.id === id);
      if (node) {
        (node as Node).setCollapsed(true);
        (node as Node).setDimensions(
          new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
        );
      }
    });
  }
}
