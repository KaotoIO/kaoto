import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext, CatalogModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useReplaceStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const replaceModalContext = useContext(ActionConfirmationModalContext);
  const childrenNodes = vizNode.getChildren();
  const hasChildren = childrenNodes !== undefined && childrenNodes.length > 0;

  const onReplaceNode = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    if (hasChildren) {
      /** Open delete confirm modal, get the confirmation  */
      const isReplaceConfirmed = await replaceModalContext?.actionConfirmation({
        title: 'Replace step?',
        text: 'Step and its children will be lost.',
      });

      if (isReplaceConfirmed !== ACTION_ID_CONFIRM) return;
    }

    /** Find compatible components */
    const catalogFilter = entitiesContext.camelResource.getCompatibleComponents(AddStepMode.ReplaceStep, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(catalogFilter);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, hasChildren, replaceModalContext, vizNode]);

  const value = useMemo(
    () => ({
      onReplaceNode,
    }),
    [onReplaceNode],
  );

  return value;
};
