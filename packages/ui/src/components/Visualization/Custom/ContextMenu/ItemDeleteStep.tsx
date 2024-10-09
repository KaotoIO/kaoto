import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';
import { findModalCustomizationRecursively, processNodeInteractionAddonRecursively } from './item-delete-helper';

interface ItemDeleteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const ItemDeleteStep: FunctionComponent<ItemDeleteStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onRemoveNode = useCallback(async () => {
    const modalCustoms = findModalCustomizationRecursively(props.vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    let modalAnswer: string | undefined = ACTION_ID_CONFIRM;
    if (props.loadActionConfirmationModal || modalCustoms.length > 0) {
      const additionalModalText = modalCustoms.length > 0 ? modalCustoms[0].additionalText : undefined;
      const buttonOptions = modalCustoms.length > 0 ? modalCustoms[0].buttonOptions : undefined;
      /** Open delete confirm modal, get the confirmation  */
      modalAnswer = await deleteModalContext?.actionConfirmation({
        title: 'Permanently delete step?',
        text: 'Step and its children will be lost.',
        additionalModalText,
        buttonOptions,
      });

      if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;
    }

    processNodeInteractionAddonRecursively(props.vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    props.vizNode?.removeChild();
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [
    deleteModalContext,
    entitiesContext,
    getRegisteredInteractionAddons,
    props.loadActionConfirmationModal,
    props.vizNode,
  ]);

  return (
    <ContextMenuItem onClick={onRemoveNode} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
