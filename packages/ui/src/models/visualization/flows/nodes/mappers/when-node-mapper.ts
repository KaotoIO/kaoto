import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { EdgeStyle } from '@patternfly/react-topology';

export class WhenNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const processorName = 'when' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: false,
      nodeType: 'branch',
    };

    const vizNode = createVisualizationNode(path, data);

    const childrenWithEdges = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    childrenWithEdges.nodes.forEach((child) => {
      vizNode.addChild(child);
    });

    const lastIndex = childrenWithEdges.nodes.length - 1;
    vizNode.setEndNodes([childrenWithEdges.nodes[lastIndex]]);
    childrenWithEdges.edges.push(BaseNodeMapper.getEdge(vizNode.id, childrenWithEdges.nodes[0].id, EdgeStyle.dashedMd));

    return { vizNode, edges: childrenWithEdges.edges };
  }
}
