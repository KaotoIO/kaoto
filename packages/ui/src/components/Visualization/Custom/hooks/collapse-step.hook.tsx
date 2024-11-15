import type { ElementModel, GraphElement } from '@patternfly/react-topology';
import { action, Dimensions, isNode } from '@patternfly/react-topology';
import { useCallback, useMemo } from 'react';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';

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
        element.getController().getGraph().layout();
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
