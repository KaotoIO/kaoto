import { useCallback, useContext, useMemo } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { StepUpdateAction } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { MetadataContext } from '../../../../providers/metadata.provider';

export const useAddStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep = AddStepMode.AppendStep,
) => {
  const { isLoading, camelResource, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const metadataContext = useContext(MetadataContext);

  const onAddStep = useCallback(async () => {
    if (isLoading || !camelResource) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = camelResource.getCompatibleComponents(mode, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, mode);

    /** Update entity */
    updateEntitiesFromCamelResource();

    /** Notify VS Code host about the new step */
    metadataContext?.onStepUpdated?.(StepUpdateAction.Add, definedComponent.type, definedComponent.name);
  }, [camelResource, catalogModalContext, isLoading, metadataContext, mode, updateEntitiesFromCamelResource, vizNode]);

  const value = useMemo(
    () => ({
      onAddStep,
    }),
    [onAddStep],
  );

  return value;
};
