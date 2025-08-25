import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { isDefined } from '../../../../utils/is-defined';
import { updateIds } from '../../../../utils/update-ids';
import { cloneDeep } from 'lodash';
import { EntityType } from '../../../../models/camel/entities';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

export const useDuplicateStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const vizNodeContent = vizNode.getCopiedContent();
  const parentVizNode = vizNode.getParentNode();

  const canDuplicate = useMemo(() => {
    if (!isDefined(vizNodeContent)) return false;

    // check for step array nodes
    if (vizNode.getNodeInteraction().canHaveNextStep) {
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        AddStepMode.AppendStep,
        vizNode.data,
        vizNode.getComponentSchema()?.definition,
      );

      /** Check paste compatibility */
      return catalogModalContext?.checkCompatibility(vizNodeContent.name, filter) ?? false;
    }

    // check for special children nodes in case of Route Entity
    if (parentVizNode?.getNodeInteraction().canHaveSpecialChildren) {
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        parentVizNode.data,
        parentVizNode.getComponentSchema()?.definition,
      );

      /** Check paste compatibility */
      return catalogModalContext?.checkCompatibility(vizNodeContent.name, filter) ?? false;
    }

    // check for root containers only in case of Route Entity
    if (vizNodeContent.type === SourceSchemaType.Route && !isDefined(parentVizNode)) {
      return true;
    }

    return false;
  }, [catalogModalContext, entitiesContext.camelResource, parentVizNode, vizNode, vizNodeContent]);

  const onDuplicate = useCallback(async () => {
    if (!vizNode || !vizNodeContent || !entitiesContext) return;

    const updatedVizNodeContent = updateIds(cloneDeep(vizNodeContent));
    if (vizNodeContent.type === SourceSchemaType.Route && !isDefined(parentVizNode)) {
      entitiesContext.camelResource.addNewEntity(updatedVizNodeContent.name as EntityType, {
        [updatedVizNodeContent.name]: updatedVizNodeContent.definition,
      });
    } else {
      /** Append the content of the current node on the current node */
      vizNode.pasteBaseEntityStep(updatedVizNodeContent, AddStepMode.AppendStep);
    }

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [entitiesContext, parentVizNode, vizNode, vizNodeContent]);

  const value = useMemo(
    () => ({
      onDuplicate,
      canDuplicate,
    }),
    [canDuplicate, onDuplicate],
  );

  return value;
};
