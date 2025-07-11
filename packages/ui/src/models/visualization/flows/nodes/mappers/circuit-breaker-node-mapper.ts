import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { CanvasEdge } from '../../../../../components/Visualization/Canvas';

export class CircuitBreakerNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const processorName: keyof ProcessorDefinition = 'circuitBreaker';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);
    const edges: CanvasEdge[] = [];

    const childrenWithEdges = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    childrenWithEdges.forEach((child) => {
      vizNode.addChild(child.vizNode);
      edges.push(...child.edges);
    });

    const onFallbackNodeWithEdges = this.getChildrenFromSingleClause(`${path}.onFallback`, entityDefinition);
    if (onFallbackNodeWithEdges.length > 0) {
      vizNode.addChild(onFallbackNodeWithEdges[0].vizNode);
      edges.push(...onFallbackNodeWithEdges[0].edges);
    }

    return { vizNode, edges };
  }
}
