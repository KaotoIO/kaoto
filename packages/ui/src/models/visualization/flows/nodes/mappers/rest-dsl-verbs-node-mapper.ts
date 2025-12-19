import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { INodeMapper } from '../node-mapper';
import { BaseNodeMapper } from './base-node-mapper';

export class RestDslVerbsNodeMapper extends BaseNodeMapper {
  constructor(
    protected readonly rootNodeMapper: INodeMapper,
    protected readonly method: string,
  ) {
    super(rootNodeMapper);
  }

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const data: CamelRouteVisualEntityData = {
      catalogKind: CatalogKind.Entity,
      name: this.method,
      path,
      processorName: this.method as keyof ProcessorDefinition,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    const [toDirectNode] = this.getChildrenFromSingleClause(`${path}.to`, entityDefinition);

    if (isDefined(toDirectNode)) {
      (toDirectNode.data as CamelRouteVisualEntityData).catalogKind = CatalogKind.Component;
      (toDirectNode.data as CamelRouteVisualEntityData).componentName = 'direct';
      (toDirectNode.data as CamelRouteVisualEntityData).name = 'direct';
      vizNode.addChild(toDirectNode);
    } else {
      const placeholderNode = createVisualizationNode(`${path}.to.placeholder`, {
        catalogKind: CatalogKind.Pattern,
        name: 'placeholder',
        path: `${path}.to.placeholder`,
        processorName: this.method as keyof ProcessorDefinition,
        isPlaceholder: true,
      });
      vizNode.addChild(placeholderNode);
    }

    return vizNode;
  }
}
