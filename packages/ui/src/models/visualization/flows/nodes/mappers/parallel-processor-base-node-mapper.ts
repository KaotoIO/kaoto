import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { BaseNodeMapper } from './base-node-mapper';

export abstract class ParallelProcessorBaseNodeMapper extends BaseNodeMapper {
  abstract getProcessorName(): keyof ProcessorDefinition;

  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = this.getProcessorName();

    const data: IVisualizationNodeData = {
      name: processorName,
      path,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path, data);
    const children = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
      /**
       * Remove the previous and next node from the child to prevent
       * edges between the children nodes of the Parallel processor
       */
      child.setPreviousNode(undefined);
      child.setNextNode(undefined);
    });

    return vizNode;
  }
}
