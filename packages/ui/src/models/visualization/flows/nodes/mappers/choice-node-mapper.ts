import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class ChoiceNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'choice';

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

    /** Enrich the node*/
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);

    const whenNodes = await this.getChildrenFromArrayClause(`${path}.when`, entityDefinition);
    whenNodes.forEach((whenNode) => {
      vizNode.addChild(whenNode);
    });

    const otherwiseNode = await this.getChildrenFromSingleClause(`${path}.otherwise`, entityDefinition);
    if (otherwiseNode.length > 0) {
      vizNode.addChild(otherwiseNode[0]);
    }

    return vizNode;
  }
}
