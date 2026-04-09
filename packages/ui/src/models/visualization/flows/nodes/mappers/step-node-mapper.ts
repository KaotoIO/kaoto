import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX, getValue } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';

export class StepNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'step';

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

    const stepDefinition: Step = getValue(entityDefinition, path);
    if (DataMapperNodeMapper.isDataMapperNode(stepDefinition)) {
      return this.rootNodeMapper.getVizNodeFromProcessor(
        path,
        {
          processorName: DATAMAPPER_ID_PREFIX,
        },
        entityDefinition,
      );
    }

    const vizNode = createVisualizationNode(path, data);
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);

    const children = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
    });

    return vizNode;
  }
}
