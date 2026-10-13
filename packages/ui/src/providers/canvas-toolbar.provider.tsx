import { createContext, PropsWithChildren, useContext, useEffect, useLayoutEffect, useState } from 'react';

import { CanvasToolbarStore } from '../components/Visualization/Canvas/CanvasToolbar/canvas-toolbar-store';
import { NodeToolbarTrigger } from '../models';
import { SettingsContext } from './settings.provider';

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
