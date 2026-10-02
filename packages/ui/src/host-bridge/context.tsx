import type { IEventBus } from '@kaoto/editor-api';
import { createContext, type FunctionComponent, type ReactNode, useContext } from 'react';

export const HostBridgeContext = createContext<IEventBus | undefined>(undefined);

export const HostBridgeProvider: FunctionComponent<{ bus: IEventBus; children: ReactNode }> = ({ bus, children }) => (
  <HostBridgeContext.Provider value={bus}>{children}</HostBridgeContext.Provider>
);

/** Throws if called outside a HostBridgeProvider. */
export function useHostBus(): IEventBus {
  const bus = useContext(HostBridgeContext);
  if (!bus) throw new Error('useHostBus must be used inside a HostBridgeProvider');
  return bus;
}
