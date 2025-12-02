import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export abstract class ParallelProcessorBaseNodeMapper extends BaseNodeMapper {
  abstract getProcessorName(): keyof ProcessorDefinition;

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = this.getProcessorName();

    const data: CamelRouteVisualEntityData = {
      catalogKind: CatalogKind.Processor,
      name: processorName,
      path,
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);
    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
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
