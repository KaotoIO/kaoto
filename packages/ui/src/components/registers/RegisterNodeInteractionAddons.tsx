import { FunctionComponent, PropsWithChildren, useContext, useRef } from 'react';
import { datamapperActivationFn } from './datamapper.activationfn';
import { MetadataContext } from '../../providers';
import { onDeleteDataMapper } from '../DataMapper/on-delete-datamapper';
import { NodeInteractionAddonContext } from './interactions/node-interaction-addon.provider';
import { IInteractionAddonType, IRegisteredInteractionAddon } from './interactions/node-interaction-addon.model';

export const RegisterNodeInteractionAddons: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const metadataApi = useContext(MetadataContext)!;
  const { registerInteractionAddon } = useContext(NodeInteractionAddonContext);
  const addonsToRegister = useRef<IRegisteredInteractionAddon[]>([
    {
      type: IInteractionAddonType.ON_DELETE,
      activationFn: datamapperActivationFn,
      callback: (vizNode) => {
        metadataApi && onDeleteDataMapper(metadataApi, vizNode);
      },
    },
  ]);

  addonsToRegister.current.forEach((interaction) => {
    registerInteractionAddon(interaction);
  });

  return <>{children}</>;
};
