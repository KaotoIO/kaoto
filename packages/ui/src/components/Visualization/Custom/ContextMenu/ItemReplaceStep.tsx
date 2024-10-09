import { SyncAltIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';
import { findModalCustomizationRecursively, processNodeInteractionAddonRecursively } from './item-delete-helper';

interface ItemReplaceStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const ItemReplaceStep: FunctionComponent<ItemReplaceStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const replaceModalContext = useContext(ActionConfirmationModalContext);
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onReplaceNode = useCallback(async () => {
    if (!props.vizNode || !entitiesContext) return;

    const modalCustoms = findModalCustomizationRecursively(props.vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );
    let modalAnswer: string | undefined = ACTION_ID_CONFIRM;
    if (props.loadActionConfirmationModal || modalCustoms.length > 0) {
      const additionalModalText = modalCustoms.length > 0 ? modalCustoms[0].additionalText : undefined;
      const buttonOptions = modalCustoms.length > 0 ? modalCustoms[0].buttonOptions : undefined;
      /** Open delete confirm modal, get the confirmation  */
      modalAnswer = await replaceModalContext?.actionConfirmation({
        title: 'Replace step?',
        text: 'Step and its children will be lost.',
        additionalModalText,
        buttonOptions,
      });

      if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;
    }

    /** Find compatible components */
    const catalogFilter = entitiesContext.camelResource.getCompatibleComponents(
      AddStepMode.ReplaceStep,
      props.vizNode.data,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(catalogFilter);
    if (!definedComponent) return;

    processNodeInteractionAddonRecursively(props.vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    /** Add new node to the entities */
    props.vizNode.addBaseEntityStep(definedComponent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [
    props.vizNode,
    props.loadActionConfirmationModal,
    entitiesContext,
    catalogModalContext,
    replaceModalContext,
    getRegisteredInteractionAddons,
  ]);

  return (
    <ContextMenuItem onClick={onReplaceNode} data-testid={props['data-testid']}>
      <SyncAltIcon /> Replace
    </ContextMenuItem>
  );
};
