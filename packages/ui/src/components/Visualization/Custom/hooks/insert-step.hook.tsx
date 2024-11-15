import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useInsertStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep = AddStepMode.InsertChildStep,
) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);

  const onInsertStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(
      mode,
      vizNode.data,
      vizNode.getComponentSchema()?.definition,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;
    const targetProperty = mode === AddStepMode.InsertChildStep ? 'steps' : undefined;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, mode, targetProperty);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onInsertStep,
    }),
    [onInsertStep],
  );

  return value;
};
