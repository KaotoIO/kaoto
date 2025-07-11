import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class CircuitBreakerNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName: keyof ProcessorDefinition = 'circuitBreaker';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    const { nodes: childNodes, edges: childEdges } = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    childNodes.forEach((child) => {
      vizNode.addChild(child);
    });

    const { nodes: onFallbackNodes, edges: onFallbackEdges } = this.getChildrenFromSingleClause(
      `${path}.onFallback`,
      entityDefinition,
    );
    if (onFallbackNodes.length > 0) {
      vizNode.addChild(onFallbackNodes[0]);
    }

    return { nodes: [vizNode], edges: [...childEdges, ...onFallbackEdges] };
  }
}
