import { BaseNodeMapper } from './base-node-mapper';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { IVisualizationNode } from '../../../base-visual-entity';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';

export class FromNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode[] {
    const processorName = 'from' as keyof ProcessorDefinition;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(_componentLookup), NodeIconType.Component),
      processorName,
      isGroup: false,
    };

    const vizNode = createVisualizationNode(path, data);

    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);

    if (children.length > 0) {
      children[0].setPreviousNode(vizNode);
      vizNode.setNextNode(children[0]);
    }

    children.unshift(vizNode);
    return children;
  }
}
