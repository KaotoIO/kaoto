import { isDefined } from '@kaoto/forms';
import { useVisualizationController } from '@patternfly/react-topology';
import { cloneDeep } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { EntityType } from '../../../../models/camel/entities';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { updateIds } from '../../../../utils/update-ids';
import {
  IInteractionType,
  IOnCopyAddon,
  IOnDuplicateAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { processOnCopyAddon, processOnDuplicateAddonRecursively } from '../ContextMenu/item-interaction-helper';

export const useDuplicateStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
  const controller = useVisualizationController();
  let vizNodeContent = vizNode.getCopiedContent();

  if (vizNodeContent) {
    vizNodeContent = processOnCopyAddon(
      vizNode,
      vizNodeContent,
      (vn) =>
        nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_COPY, vn) as IOnCopyAddon[],
    );
  }
  const parentVizNode = vizNode.getParentNode();

  const canDuplicate = useMemo(() => {
    if (!isDefined(vizNodeContent)) return false;

    // check for step array nodes
    if (vizNode.getNodeInteraction().canHaveNextStep) {
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        AddStepMode.AppendStep,
        vizNode.data,
        vizNode.getNodeDefinition(),
      );

      /** Check paste compatibility */
      return catalogModalContext?.checkCompatibility(vizNodeContent.name, filter) ?? false;
    }

    // check for special children nodes in case of Route Entity
    if (parentVizNode?.getNodeInteraction().canHaveSpecialChildren) {
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        parentVizNode.data,
        parentVizNode.getNodeDefinition(),
      );

      /** Check paste compatibility */
      return catalogModalContext?.checkCompatibility(vizNodeContent.name, filter) ?? false;
    }

    // check for root containers only in case of Route Entity
    if (vizNodeContent.type === SourceSchemaType.Route && !isDefined(parentVizNode)) {
      return true;
    }

    return false;
  }, [catalogModalContext, entitiesContext, parentVizNode, vizNode, vizNodeContent]);

  const onDuplicate = useCallback(async () => {
    if (!vizNode || !vizNodeContent || !entitiesContext) return;

    let updatedVizNodeContent = updateIds(cloneDeep(vizNodeContent));

    updatedVizNodeContent = await processOnDuplicateAddonRecursively(
      vizNode,
      updatedVizNodeContent,
      (vn) =>
        nodeInteractionAddonContext.getRegisteredInteractionAddons(
          IInteractionType.ON_DUPLICATE,
          vn,
        ) as IOnDuplicateAddon[],
    );

    if (!updatedVizNodeContent) return;

    if (vizNodeContent.type === SourceSchemaType.Route && !isDefined(parentVizNode)) {
      const originalEntityId = vizNode.getId();
      entitiesContext.camelResource.addNewEntity(
        updatedVizNodeContent.name as EntityType,
        { [updatedVizNodeContent.name]: updatedVizNodeContent.definition },
        originalEntityId,
      );
    } else {
      /** Append the content of the current node on the current node */
      vizNode.pasteBaseEntityStep(updatedVizNodeContent, AddStepMode.AppendStep);

      // Set an empty model to clear the graph, Fixes an issue rendering child nodes incorrectly
      if (parentVizNode?.getNodeInteraction().canHaveSpecialChildren) {
        const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
          (parentVizNode.data as CamelRouteVisualEntityData).processorName,
        );
        if (
          stepsProperties.some(
            (property) =>
              property.type === 'array-clause' &&
              property.name === updatedVizNodeContent.name &&
              isDefined(parentVizNode.getChildren()),
          )
        ) {
          controller.fromModel({
            nodes: [],
            edges: [],
          });
        }
      }
    }

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [controller, entitiesContext, nodeInteractionAddonContext, parentVizNode, vizNode, vizNodeContent]);

  const value = useMemo(
    () => ({
      onDuplicate,
      canDuplicate,
    }),
    [canDuplicate, onDuplicate],
  );

  return value;
};
