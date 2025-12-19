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

    const routeConfigurationProperties = SPECIAL_PROCESSORS_PARENTS_MAP.routeConfiguration;
    routeConfigurationProperties.forEach((property) => {
      const configNodes = this.getChildrenFromBranch(`${path}.${property}`, entityDefinition);
      configNodes.forEach((node, index, nodesArray) => {
        /* routeConfiguration branches needs to be split from each other, as they work in parallel */
        node.setPreviousNode(undefined);
        const previousNode = nodesArray[index - 1];
        previousNode?.setNextNode(undefined);

        /* Remove placeholders from the routeConfiguration since it creates one per branch */
        if (node.data.path?.endsWith('placeholder')) return;

        vizNode.addChild(node);
      });
    });

    const isEmptyRouteConfiguration = (vizNode.getChildren() ?? []).length === 0;

    if (isEmptyRouteConfiguration) {
      /* set a single placeholder if needed */
      const placeholderNode = createVisualizationNode(`${path}.placeholder`, {
        catalogKind: CatalogKind.Pattern,
        name: 'placeholder-special-child',
        isPlaceholder: true,
        processorName: 'routeConfiguration',
        path: 'routeConfiguration.placeholder',
      });
      vizNode.addChild(placeholderNode);
    }

    return vizNode;
  }
}
