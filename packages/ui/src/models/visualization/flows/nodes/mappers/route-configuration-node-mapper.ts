import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../../../special-processors.constants';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class RouteConfigurationNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = 'routeConfiguration' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      catalogKind: CatalogKind.Entity,
      name: processorName,
      path,
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    SPECIAL_PROCESSORS_PARENTS_MAP.routeConfiguration.forEach((property) => {
      const configNodes = this.getChildrenFromArrayClause(`${path}.${property}`, entityDefinition);
      configNodes.forEach((node) => {
        vizNode.addChild(node);
      });
    });

    return vizNode;
  }
}
