import { useVisualizationController } from '@patternfly/react-topology';
import { useCallback, useContext, useMemo } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { StepUpdateAction } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { MetadataContext } from '../../../../providers/metadata.provider';
import { requestNodeSelection } from '../../Canvas/node-selection-state';

export const useAddStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep = AddStepMode.AppendStep,
) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const metadataContext = useContext(MetadataContext);
  const controller = useVisualizationController();

  const onAddStep = useCallback(async () => {
    if (!entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(mode, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    const newStepPath = vizNode.addBaseEntityStep(definedComponent, mode);
    requestNodeSelection(controller, vizNode, newStepPath);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();

    /** Notify VS Code host about the new step */
    await metadataContext?.onStepUpdated?.(StepUpdateAction.Add, definedComponent.type, definedComponent.name);
  }, [catalogModalContext, controller, entitiesContext, metadataContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onAddStep,
    }),
    [onAddStep],
  );

  return value;
};
