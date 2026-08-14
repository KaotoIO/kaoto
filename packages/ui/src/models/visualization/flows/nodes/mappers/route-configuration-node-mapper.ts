import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../../../special-processors.constants';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { BaseNodeMapper } from './base-node-mapper';

export class RouteConfigurationNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = 'routeConfiguration' as keyof ProcessorDefinition;

    const data: IVisualizationNodeData = {
      name: processorName,
      path,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Entity } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path, data);

    for (const property of SPECIAL_PROCESSORS_PARENTS_MAP.routeConfiguration) {
      const configNodes = await this.getChildrenFromArrayClause(`${path}.${property}`, entityDefinition);
      configNodes.forEach((node) => {
        vizNode.addChild(node);
      });
    }

    return vizNode;
  }
}
