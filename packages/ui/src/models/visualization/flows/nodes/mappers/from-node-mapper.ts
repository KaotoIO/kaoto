import { BaseNodeMapper } from './base-node-mapper';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import { CanvasEdge } from '../../../../../components/Visualization/Canvas';

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
    const edges: CanvasEdge[] = [];

    const childrenWithEdges = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    childrenWithEdges.forEach((child) => {
      vizNode.addChild(child.vizNode);
      edges.push(...child.edges);
    });

    vizNode.setNextNode(childrenWithEdges[0].vizNode ?? undefined);
    childrenWithEdges[0]?.vizNode.setPreviousNode(vizNode);

    edges.push(BaseNodeMapper.getEdge(vizNode.id, childrenWithEdges[0].vizNode.id));

    return { vizNode, edges };
  }
}
