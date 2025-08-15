import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { MetadataContext } from '../../../../providers/metadata.provider';

export const useAddStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep = AddStepMode.AppendStep,
) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const metadataContext = useContext(MetadataContext);

  const onAddStep = useCallback(async () => {
    if (!entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(mode, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, mode);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();

    /** Notify VS Code host about the new step */
    metadataContext?.onStepAdded?.(definedComponent.type, definedComponent.name);
  }, [catalogModalContext, entitiesContext, metadataContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onAddStep,
    }),
    [onAddStep],
  );

  return value;
};
