import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class CircuitBreakerNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'circuitBreaker';

    const data: CamelRouteVisualEntityData = {
      name: processorName,
      path,
      processorName,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
    };

    const vizNode = createVisualizationNode(path, data);
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);

    const children = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
    });

    const onFallbackNode = await this.getChildrenFromSingleClause(`${path}.onFallback`, entityDefinition);
    if (onFallbackNode.length > 0) {
      vizNode.addChild(onFallbackNode[0]);
    }

    return vizNode;
  }
}
