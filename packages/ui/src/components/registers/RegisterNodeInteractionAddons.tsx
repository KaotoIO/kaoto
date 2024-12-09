import { FunctionComponent, PropsWithChildren, useContext, useRef } from 'react';
import { datamapperActivationFn } from './datamapper.activationfn';
import { MetadataContext } from '../../providers';
import {
  ACTION_ID_DELETE_STEP_AND_FILE,
  ACTION_ID_DELETE_STEP_ONLY,
  onDeleteDataMapper,
} from '../DataMapper/on-delete-datamapper';
import { NodeInteractionAddonContext } from './interactions/node-interaction-addon.provider';
import { IInteractionAddonType, IRegisteredInteractionAddon } from './interactions/node-interaction-addon.model';
import { ButtonVariant } from '@patternfly/react-core';

export const RegisterNodeInteractionAddons: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const metadataApi = useContext(MetadataContext)!;
  const { registerInteractionAddon } = useContext(NodeInteractionAddonContext);
  const addonsToRegister = useRef<IRegisteredInteractionAddon[]>([
    {
      type: IInteractionAddonType.ON_DELETE,
      activationFn: datamapperActivationFn,
      callback: (vizNode, modalAnswer) => {
        metadataApi && onDeleteDataMapper(metadataApi, vizNode, modalAnswer);
      },
      modalCustomization: {
        additionalText: 'Do you also want to delete the associated Kaoto DataMapper mapping file (XSLT)?',
        buttonOptions: {
          [ACTION_ID_DELETE_STEP_AND_FILE]: {
            variant: ButtonVariant.danger,
            buttonText: 'Delete both step and file',
          },
          [ACTION_ID_DELETE_STEP_ONLY]: {
            variant: ButtonVariant.secondary,
            isDanger: true,
            buttonText: 'Delete the step, but keep the file',
          },
        },
      },
    },
  ]);

  addonsToRegister.current.forEach((interaction) => {
    registerInteractionAddon(interaction);
  });

  return <>{children}</>;
};
