import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../../../special-processors.constants';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class RouteConfigurationNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = 'routeConfiguration' as keyof ProcessorDefinition;

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

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Entity);

    for (const property of SPECIAL_PROCESSORS_PARENTS_MAP.routeConfiguration) {
      const configNodes = await this.getChildrenFromArrayClause(`${path}.${property}`, entityDefinition);
      configNodes.forEach((node) => {
        vizNode.addChild(node);
      });
    }

    return vizNode;
  }
}
