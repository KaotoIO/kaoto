import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class ChoiceNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName: keyof ProcessorDefinition = 'choice';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    const whenNodesAndEdges = this.getChildrenFromArrayClause(`${path}.when`, entityDefinition);
    whenNodesAndEdges.nodes.forEach((whenNode) => {
      vizNode.addChild(whenNode);
    });

    const otherwiseNodeAndEdges = this.getChildrenFromSingleClause(`${path}.otherwise`, entityDefinition);
    if (otherwiseNodeAndEdges.nodes.length > 0) {
      vizNode.addChild(otherwiseNodeAndEdges.nodes[0]);
    }

    return { nodes: [vizNode], edges: [...whenNodesAndEdges.edges, ...otherwiseNodeAndEdges.edges] };
  }
}
