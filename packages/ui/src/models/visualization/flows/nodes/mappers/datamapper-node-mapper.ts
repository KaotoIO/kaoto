import { Step } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX, isDataMapperNode } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class DataMapperNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    _entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = DATAMAPPER_ID_PREFIX;

    const data: CamelRouteVisualEntityData = {
      name: processorName,
      path,
      processorName: DATAMAPPER_ID_PREFIX,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    };

    const vizNode = createVisualizationNode(path + ':' + processorName, data);
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);
    return vizNode;
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    return isDataMapperNode(stepDefinition);
  }
}
