import { useCallback, useContext, useMemo } from 'react';
import { StepUpdateAction } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
  CatalogModalContext,
  MetadataContext,
} from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IInteractionType } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';

export const useReplaceStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const metadataContext = useContext(MetadataContext);
  const replaceModalContext = useContext(ActionConfirmationModalContext);
  const childrenNodes = vizNode.getChildren();
  const hasChildren = childrenNodes !== undefined && childrenNodes.length > 0;
  const isPlaceholderNode = hasChildren && childrenNodes.length === 1 && childrenNodes[0].data.isPlaceholder;
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onReplaceNode = useCallback(async () => {
    if (!entitiesContext) return;

    const modalCustoms = findOnDeleteModalCustomizationRecursively(vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn),
    );
    let modalAnswer: string | undefined = ACTION_ID_CONFIRM;
    if (hasChildren && !isPlaceholderNode) {
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
    const catalogFilter = entitiesContext.camelResource.getCompatibleComponents(AddStepMode.ReplaceStep, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(catalogFilter);
    if (!definedComponent) return;

    processOnDeleteAddonRecursively(vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn),
    );

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();

    /** Notify VS Code host about the new step */
    metadataContext?.onStepUpdated?.(StepUpdateAction.Replace, definedComponent.type, definedComponent.name);
  }, [
    catalogModalContext,
    entitiesContext,
    getRegisteredInteractionAddons,
    hasChildren,
    isPlaceholderNode,
    metadataContext,
    replaceModalContext,
    vizNode,
  ]);

  const value = useMemo(
    () => ({
      onReplaceNode,
    }),
    [onReplaceNode],
  );

  return value;
};
