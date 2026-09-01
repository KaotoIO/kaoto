import { Rest } from '@kaoto/camel-catalog/types';

import { CatalogKind, IVisualizationNodeIds } from '../../models';
import { REST_DSL_VERBS } from '../../models/special-processors.constants';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { RestEntity } from '../../models/visualization/flows/rest-entity';

/**
 * Represents a node in the REST DSL tree structure.
 * Used to display REST configurations and REST services with their methods in a hierarchical tree view.
 */
export interface RestTreeNode extends IVisualizationNodeIds {
  id: string;
  entityId: string;
  type: 'restConfiguration' | 'rest' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';
  label?: string;
  modelPath: string;
  children?: Omit<RestTreeNode, 'children'>[];
}

/**
 * Converts REST entities into a tree structure for REST DSL display.
 * Processes RestConfiguration and Rest entities, organizing REST methods as child nodes.
 *
 * @param restEntities - Array of REST entities to convert
 * @returns Array of tree nodes representing the REST DSL hierarchy
 */
export const restToTree = (restEntities: RestEntity[]): RestTreeNode[] => {
  const restConfigEntities: CamelRestConfigurationVisualEntity[] = restEntities.filter(
    (entity) => entity instanceof CamelRestConfigurationVisualEntity,
  );
  const restVisualEntities = restEntities.filter((entity) => entity instanceof CamelRestVisualEntity);

  const restConfigNodes: RestTreeNode[] = restConfigEntities.map((entity) => {
    const entityId = entity.getId();

    return {
      id: entityId,
      entityId: entityId,
      type: 'restConfiguration',
      label: 'Rest configuration',
      modelPath: entity.getRootPath(),
      primaryNodeId: {
        name: 'restConfiguration',
        catalogKind: CatalogKind.Entity,
      },
    };
  });

  const restNodes: RestTreeNode[] = restVisualEntities.map((entity) => {
    const entityId = entity.getId();
    const methodsTreeNodes: RestTreeNode[] = [];
    const restDef = entity.getNodeDefinition(entity.getRootPath()) as Rest;

    REST_DSL_VERBS.forEach((method) => {
      const methodArray = restDef?.[method];
      if (!Array.isArray(methodArray)) {
        return;
      }

      methodArray.forEach((methodDef, index) => {
        const id: string = methodDef.id ?? `${entityId}-${method}-${index}`;

        methodsTreeNodes.push({
          id,
          entityId,
          type: method,
          label: methodDef.path,
          modelPath: `rest.${method}.${index}`,
          primaryNodeId: {
            name: method,
            catalogKind: CatalogKind.Pattern,
          },
        });
      });
    });

    return {
      id: entityId,
      entityId: entityId,
      type: 'rest',
      label: 'Rest',
      modelPath: entity.getRootPath(),
      children: methodsTreeNodes,
      primaryNodeId: {
        name: 'rest',
        catalogKind: CatalogKind.Entity,
      },
    };
  });

  return [...restConfigNodes, ...restNodes];
};
