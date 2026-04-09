import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class WhenNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = 'when' as keyof ProcessorDefinition;

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

    return vizNode;
  }
}
