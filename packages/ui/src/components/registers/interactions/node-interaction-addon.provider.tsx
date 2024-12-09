import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { IVisualizationNode } from '../../../models';
import {
  IInteractionAddonType,
  INodeInteractionAddonContext,
  IRegisteredInteractionAddon,
} from './node-interaction-addon.model';

export const NodeInteractionAddonContext = createContext<INodeInteractionAddonContext>({
  registerInteractionAddon: () => {},
  getRegisteredInteractionAddons: () => [],
});

export const NodeInteractionAddonProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const registeredInteractionAddons = useRef<IRegisteredInteractionAddon[]>([]);

  const registerInteractionAddon = useCallback((interaction: IRegisteredInteractionAddon) => {
    registeredInteractionAddons.current.push(interaction);
  }, []);

  const getRegisteredInteractionAddons = useCallback(
    (interaction: IInteractionAddonType, vizNode: IVisualizationNode) => {
      return registeredInteractionAddons.current.filter(
        (addon) => addon.type === interaction && addon.activationFn(vizNode),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      registerInteractionAddon,
      getRegisteredInteractionAddons,
    }),
    [getRegisteredInteractionAddons, registerInteractionAddon],
  );

  return <NodeInteractionAddonContext.Provider value={value}>{children}</NodeInteractionAddonContext.Provider>;
};
