import { Rest } from '@kaoto/camel-catalog/types';

import { BaseVisualCamelEntity } from '../../models';
import { REST_DSL_VERBS } from '../../models/special-processors.constants';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';

export interface RestTreeNode {
  id: string;
  entityId: string;
  type: 'restConfiguration' | 'rest' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';
  label?: string;
  modelPath: string;
  children?: Omit<RestTreeNode, 'children'>[];
}

export const restToTree = (visualEntities: BaseVisualCamelEntity[]): RestTreeNode[] => {
  const restConfigEntities: CamelRestConfigurationVisualEntity[] = visualEntities.filter(
    (entity) => entity instanceof CamelRestConfigurationVisualEntity,
  );
  const restEntities = visualEntities.filter((entity) => entity instanceof CamelRestVisualEntity);

  const restConfigNodes: RestTreeNode[] = restConfigEntities.map((entity) => {
    const entityId = entity.getId();

    return {
      id: entityId,
      entityId: entityId,
      type: 'restConfiguration',
      label: 'Rest configuration',
      modelPath: entity.getRootPath(),
    };
  });

  const restNodes: RestTreeNode[] = restEntities.map((entity) => {
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
    };
  });

  return [...restConfigNodes, ...restNodes];
};
