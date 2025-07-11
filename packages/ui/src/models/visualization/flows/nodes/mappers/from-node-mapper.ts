import { BaseNodeMapper } from './base-node-mapper';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';

export class FromNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName = 'from' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(_componentLookup), NodeIconType.Component),
      processorName,
      isGroup: false,
    };

    const vizNode = createVisualizationNode(path, data);

    const { nodes, edges } = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    vizNode.setNextNode(nodes[0] ?? undefined);
    nodes[0]?.setPreviousNode(vizNode);

    edges.push(BaseNodeMapper.getEdge(vizNode.id, nodes[0].id));

    return { nodes: [vizNode, ...nodes], edges };
  }
}
