import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class FromNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'from' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      name: processorName,
      path,
      processorName,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Entity } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path, data);

    /** Enrich the node*/
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Entity);

    const stepNodes = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    stepNodes.forEach((stepNode) => {
      vizNode.addChild(stepNode);
    });

    return vizNode;
  }
}
