import type { ElementModel, GraphElement } from '@patternfly/react-topology';
import { action, Dimensions, isNode } from '@patternfly/react-topology';
import { useCallback, useMemo } from 'react';

import { IVisualizationNode } from '../../../../models';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { COLLAPSE_STATE, CollapseHandlerState } from '../../Canvas/collapse-handler-state';

export const useCollapseStep = (element: GraphElement<ElementModel, unknown>) => {
  if (!isNode(element)) {
    throw new Error('useCollapseStep must be used only on Node elements');
  }

  const handleOnCollapse = useCallback(
    (collapsed: boolean) => {
      action(() => {
        if (collapsed) {
          element.setDimensions(new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT));
        }

        element.setCollapsed(collapsed);

        const controller = element.getController();
        controller.getGraph().layout();

        const id = (element.getData()?.vizNode as IVisualizationNode)?.getNodeDefinition()?.id;
        if (!id) return;

        const state = controller.getState<CollapseHandlerState>();
        const current = state[COLLAPSE_STATE] ?? [];
        let collapsedIds: typeof current;
        if (collapsed) {
          if (current.includes(id)) {
            return;
          } else {
            collapsedIds = [...current, id];
          }
        } else {
          collapsedIds = current.filter((cid) => cid !== id);
        }
        controller.setState({ [COLLAPSE_STATE]: collapsedIds });
      })();
    },
    [element],
  );

  const onExpandNode = useCallback(() => {
    handleOnCollapse(false);
  }, [handleOnCollapse]);

  const onCollapseNode = useCallback(() => {
    handleOnCollapse(true);
  }, [handleOnCollapse]);

  const value = useMemo(
    () => ({
      onExpandNode,
      onCollapseNode,
    }),
    [onCollapseNode, onExpandNode],
  );

  return value;
};
