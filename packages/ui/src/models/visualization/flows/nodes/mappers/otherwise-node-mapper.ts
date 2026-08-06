import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class OtherwiseNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _primaryNodeId: NodeIdentity,
    entityDefinition: unknown,
    _secondaryNodeId?: NodeIdentity,
    _tertiaryNodeId?: NodeIdentity,
  ): Promise<IVisualizationNode> {
    const processorName = 'otherwise' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      name: processorName,
      path,
      processorName,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path, data);
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Pattern);

    const children = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
    });

    return vizNode;
  }
}
