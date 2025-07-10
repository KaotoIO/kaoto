import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export abstract class ParallelProcessorBaseNodeMapper extends BaseNodeMapper {
  abstract getProcessorName(): keyof ProcessorDefinition;

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const processorName = this.getProcessorName();

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);
    console.log('vizNode', vizNode.getEndNodes());
    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.nodes.forEach((child) => {
      vizNode.addChild(child);
      /**
       * Remove the previous and next node from the child to prevent
       * edges between the children nodes of the Parallel processor
       */
      child.setPreviousNode(undefined);
      child.setNextNode(undefined);
    });

    return { vizNode, edges: [] };
  }
}
