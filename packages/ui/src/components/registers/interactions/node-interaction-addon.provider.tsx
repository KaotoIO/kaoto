import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { IVisualizationNode } from '../../../models';
import {
  IInteractionType,
  INodeInteractionAddonContext,
  IRegisteredInteractionAddon,
} from './node-interaction-addon.model';

export const NodeInteractionAddonContext = createContext<INodeInteractionAddonContext>({
  registerInteractionAddon: () => {},
  getRegisteredInteractionAddons: () => [],
});

export const NodeInteractionAddonProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const registeredInteractionAddons = useRef<IRegisteredInteractionAddon[]>([]);

  const registerInteractionAddon = useCallback(
    <T extends IInteractionType>(interaction: IRegisteredInteractionAddon<T>) => {
      registeredInteractionAddons.current.push(interaction);
    },
    [],
  );

  const getRegisteredInteractionAddons = useCallback(
    <T extends IInteractionType>(interaction: T, vizNode: IVisualizationNode) => {
      return registeredInteractionAddons.current.filter(
        (addon) => addon.type === interaction && addon.activationFn(vizNode),
      ) as IRegisteredInteractionAddon<T>[];
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
