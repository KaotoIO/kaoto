import { CatalogKind } from '../../../../catalog-kind';
import { REST_DSL_VERBS, REST_ELEMENT_NAME } from '../../../../special-processors.constants';
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

    REST_DSL_VERBS.forEach((verb) => {
      const restVerbNodes = this.getChildrenFromArrayClause(`${path}.${verb}`, entityDefinition);
      restVerbNodes.forEach((node) => {
        vizNode.addChild(node);
      });
    });

    const isEmptyRest = (vizNode.getChildren() ?? []).length === 0;

    if (isEmptyRest) {
      const placeholderNode = createVisualizationNode(`${path}.placeholder`, {
        catalogKind: CatalogKind.Pattern,
        name: 'placeholder-special-child',
        isPlaceholder: true,
        processorName: REST_ELEMENT_NAME,
        path: 'rest.placeholder',
      });
      vizNode.addChild(placeholderNode);
    }

    return vizNode;
  }
}
