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

    let [toDirectNode] = this.getChildrenFromSingleClause(`${path}.to`, entityDefinition);
    if (!isDefined(toDirectNode)) {
      const placeholderPath = `${path}.to.placeholder`;
      toDirectNode = createVisualizationNode(placeholderPath, {
        catalogKind: CatalogKind.Pattern,
        name: 'placeholder',
        isPlaceholder: true,
        processorName: this.method,
        path: placeholderPath,
      });
    }

    vizNode.addChild(toDirectNode);
    // vizNode.setNextNode(toDirectNode);
    // toDirectNode.setPreviousNode(vizNode);

    return vizNode;
  }
}
