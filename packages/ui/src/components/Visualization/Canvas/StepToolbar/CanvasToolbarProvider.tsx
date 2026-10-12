import { Node } from '@patternfly/react-topology';
import { createContext, PropsWithChildren, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { CanvasToolbarStore } from './canvas-toolbar-store';

export const CanvasToolbarContext = createContext<CanvasToolbarStore | undefined>(undefined);

export const CanvasToolbarProvider = ({ children }: PropsWithChildren) => {
  const settings = useContext(SettingsContext);
  const trigger = settings.getSettings().nodeToolbarTrigger ?? NodeToolbarTrigger.onHover;
  const [store] = useState(() => new CanvasToolbarStore(trigger));
  useLayoutEffect(() => {
    store.setTrigger(trigger);
  }, [store, trigger]);
  useEffect(
    () => () => {
      store.dispose();
    },
    [store],
  );
  return <CanvasToolbarContext.Provider value={store}>{children}</CanvasToolbarContext.Provider>;
};

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
