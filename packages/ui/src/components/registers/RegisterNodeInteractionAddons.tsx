import { ButtonVariant } from '@patternfly/react-core';
import { useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useContext, useEffect } from 'react';

import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { MetadataContext } from '../../providers';
import { onCopyDataMapper } from '../DataMapper/on-copy-datamapper';
import {
  ACTION_ID_DELETE_STEP_AND_FILE,
  ACTION_ID_DELETE_STEP_ONLY,
  onDeleteDataMapper,
} from '../DataMapper/on-delete-datamapper';
import { onDuplicateDataMapper } from '../DataMapper/on-duplicate-datamapper';
import { onPasteDataMapper } from '../DataMapper/on-paste-data-mapper';
import { requestNodeSelection } from '../Visualization/Canvas/node-selection-state';
import { citrusWaitForActivationFn } from './citrus-wait-for.activationfn';
import { datamapperActivationFn } from './datamapper.activationfn';
import {
  IInteractionType,
  IOnCopyAddon,
  IOnDeleteAddon,
  IOnDuplicateAddon,
  IOnPasteAddon,
  IOnUpdateAddon,
  IRegisteredInteractionAddon,
} from './interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from './interactions/node-interaction-addon.provider';
import { onUpdateCitrusWaitFor } from './on-update-citrus-wait-for';

export const RegisterNodeInteractionAddons: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const metadataApi = useContext(MetadataContext);
  const { updateEntitiesFromCamelResource } = useEntityContext();
  const controller = useVisualizationController();
  const { registerInteractionAddon } = useContext(NodeInteractionAddonContext);
  /**
   * The addons are built in the effect so they always use the latest values, e.g. `updateEntitiesFromCamelResource`
   * changes whenever the Kaoto resource is replaced.
   */
  useEffect(() => {
    const addonsToRegister: IRegisteredInteractionAddon[] = [
      {
        type: IInteractionType.ON_DELETE,
        activationFn: datamapperActivationFn,
        callback: ({ vizNode, modalAnswer }) => {
          if (metadataApi) {
            onDeleteDataMapper(metadataApi, vizNode, modalAnswer).catch((error) => {
              console.error('Failed to delete DataMapper mapping:', error);
            });
          }
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
      } as IOnDeleteAddon,
      {
        type: IInteractionType.ON_COPY,
        activationFn: datamapperActivationFn,
        callback: onCopyDataMapper,
      } as IOnCopyAddon,
      {
        type: IInteractionType.ON_DUPLICATE,
        activationFn: datamapperActivationFn,
        callback: (parameters) => onDuplicateDataMapper(metadataApi, parameters),
      } as IOnDuplicateAddon,
      {
        type: IInteractionType.ON_PASTE,
        activationFn: datamapperActivationFn,
        callback: (parameters) => onPasteDataMapper(metadataApi, parameters),
      } as IOnPasteAddon,
      {
        type: IInteractionType.ON_UPDATE,
        activationFn: citrusWaitForActivationFn,
        callback: ({ vizNode }) => {
          onUpdateCitrusWaitFor(vizNode, () => {
            /** The rebuild replaces the node being edited, so request its selection to keep the form open */
            requestNodeSelection(controller, vizNode, vizNode.data.path);
            updateEntitiesFromCamelResource();
          });
        },
      } as IOnUpdateAddon,
    ];

    const unregister = addonsToRegister.map(registerInteractionAddon);
    return () => {
      unregister.forEach((cleanup) => cleanup?.());
    };
  }, [controller, metadataApi, registerInteractionAddon, updateEntitiesFromCamelResource]);

  return <>{children}</>;
};
