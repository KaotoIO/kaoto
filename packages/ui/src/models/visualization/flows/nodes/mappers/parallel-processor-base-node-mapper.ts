import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export abstract class ParallelProcessorBaseNodeMapper extends BaseNodeMapper {
  abstract getProcessorName(): keyof ProcessorDefinition;

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName = this.getProcessorName();

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    const { nodes } = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    nodes.forEach((child) => {
      vizNode.addChild(child);
      child.setPreviousNode(undefined);
      child.setNextNode(undefined);
    });
    /**
     *
     * empty edges between the children nodes of the Parallel processor
     */
    return { nodes: [vizNode], edges: [] };
  }
}
