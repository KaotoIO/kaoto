import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { EdgeStyle } from '@patternfly/react-topology';
import { CanvasEdge } from '../../../../../components/Visualization/Canvas';

export class ChoiceNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const processorName: keyof ProcessorDefinition = 'choice';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: false, // Choice is a node, not a group
    };

    const vizNode = createVisualizationNode(path, data);
    vizNode.setEndNodes([]);
    const edges: CanvasEdge[] = [];

    const whenNodesWithEdges = this.getChildrenFromArrayClause(`${path}.when`, entityDefinition);
    whenNodesWithEdges.nodes.forEach((whenNode) => {
      vizNode.addChild(whenNode);
      edges.push(ChoiceNodeMapper.getEdge(vizNode.id, whenNode.id, EdgeStyle.dashed));
      vizNode.appendEndNodes(...whenNode.getEndNodes());
    });

    const otherwiseNodeWithEdges = this.getChildrenFromSingleClause(`${path}.otherwise`, entityDefinition);
    if (otherwiseNodeWithEdges.nodes.length > 0) {
      vizNode.addChild(otherwiseNodeWithEdges.nodes[0]);
      vizNode.appendEndNodes(...otherwiseNodeWithEdges.nodes[0].getEndNodes());
      edges.push(ChoiceNodeMapper.getEdge(vizNode.id, otherwiseNodeWithEdges.nodes[0].id));
    }

    edges.push(...whenNodesWithEdges.edges, ...otherwiseNodeWithEdges.edges);
    return { vizNode, edges };
  }
}
