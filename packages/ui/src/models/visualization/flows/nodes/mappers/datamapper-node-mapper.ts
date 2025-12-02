import { Step } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX, isDataMapperNode } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class DataMapperNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    _entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = DATAMAPPER_ID_PREFIX;

    const data: CamelRouteVisualEntityData = {
      catalogKind: CatalogKind.Processor,
      name: processorName,
      path,
      processorName: DATAMAPPER_ID_PREFIX,
      isGroup: false,
    };

    return createVisualizationNode(path + ':' + processorName, data);
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    return isDataMapperNode(stepDefinition);
  }
}
