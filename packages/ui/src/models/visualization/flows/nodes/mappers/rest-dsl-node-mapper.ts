import { REST_DSL_VERBS, REST_ELEMENT_NAME } from '../../../../camel/rest-verbs';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class RestDslNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = REST_ELEMENT_NAME;

    const data: CamelRouteVisualEntityData = {
      catalogKind: CatalogKind.Entity,
      name: processorName,
      path,
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    console.log('Processing REST');

    REST_DSL_VERBS.forEach((verb) => {
      console.log('Processing ', verb);
      const restVerbNodes = this.getChildrenFromArrayClause(`${path}.${verb}`, entityDefinition);
      restVerbNodes.forEach((node) => {
        vizNode.addChild(node);
        // vizNode.addChild(node.getNextNode()!);
      });
    });

    return vizNode;
  }
}
