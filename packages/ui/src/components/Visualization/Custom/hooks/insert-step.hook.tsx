import { isDefined } from '@kaoto/forms';
import { useVisualizationController } from '@patternfly/react-topology';
import { useCallback, useContext, useMemo } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useInsertStep = (
  vizNode: IVisualizationNode,
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep = AddStepMode.InsertChildStep,
) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const controller = useVisualizationController();

  const onInsertStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(
      mode,
      vizNode.data,
      vizNode.getNodeDefinition(),
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;
    const targetProperty = mode === AddStepMode.InsertChildStep ? 'steps' : undefined;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, mode, targetProperty);

    // Set an empty model to clear the graph, Fixes an issue rendering child nodes incorrectly
    if (mode === AddStepMode.InsertSpecialChildStep) {
      const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
        (vizNode.data as CamelRouteVisualEntityData).processorName,
      );
      if (
        stepsProperties.some(
          (property) =>
            property.type === 'array-clause' &&
            property.name === definedComponent.name &&
            isDefined(vizNode.getChildren()),
        )
      ) {
        controller.fromModel({
          nodes: [],
          edges: [],
        });
      }
    }

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, controller, entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onInsertStep,
    }),
    [onInsertStep],
  );

  return value;
};
