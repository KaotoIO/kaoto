import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useAddStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep = AddStepMode.AppendStep,
) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);

  const onAddStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(mode, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, mode);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onAddStep,
    }),
    [onAddStep],
  );

  return value;
};
