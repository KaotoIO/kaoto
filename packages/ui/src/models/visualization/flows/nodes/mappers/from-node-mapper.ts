import { BaseNodeMapper } from './base-node-mapper';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';

export class FromNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const processorName = 'from' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(_componentLookup), NodeIconType.Component),
      processorName,
      isGroup: false,
    };

    const vizNode = createVisualizationNode(path, data);

    const childrenWithEdges = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    childrenWithEdges.nodes.forEach((child) => {
      vizNode.addChild(child);
    });

    vizNode.setNextNode(childrenWithEdges.nodes[0] ?? undefined);
    childrenWithEdges.nodes[0]?.setPreviousNode(vizNode);

    childrenWithEdges.edges.push(BaseNodeMapper.getEdge(vizNode.id, childrenWithEdges.nodes[0].id));

    return { vizNode, edges: childrenWithEdges.edges };
  }
}
