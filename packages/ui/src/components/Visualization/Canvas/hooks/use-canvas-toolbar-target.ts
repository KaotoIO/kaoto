import { Node } from '@patternfly/react-topology';
import { useContext, useLayoutEffect, useMemo } from 'react';

import { IVisualizationNode } from '../../../../models';
import { CanvasToolbarContext } from '../../../../providers/canvas-toolbar.provider';

export const useCanvasToolbarTarget = (
  element: Node,
  vizNode: IVisualizationNode | undefined,
  selected: boolean | undefined,
  enabled: boolean,
  isCollapsed: boolean,
  onCollapseToggle?: () => void,
) => {
  const store = useContext(CanvasToolbarContext);
  const trigger = store?.trigger;
  const target = useMemo(
    () => (vizNode ? { element, vizNode, isCollapsed, onCollapseToggle } : undefined),
    [element, vizNode, isCollapsed, onCollapseToggle],
  );

  useLayoutEffect(() => {
    if (target && enabled) store?.update(target, !!selected);
    else store?.remove(element);
  }, [store, target, element, enabled, selected, trigger]);
  useLayoutEffect(() => () => store?.remove(element), [store, element]);

  return {
    isOpen: store?.target?.element === element,
    onMouseEnter: () => {
      if (target && enabled) store?.enter(target);
    },
    onMouseLeave: () => {
      if (target) store?.leave(target);
    },
  };
};
