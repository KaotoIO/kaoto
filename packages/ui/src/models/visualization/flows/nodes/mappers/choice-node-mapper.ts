import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class ChoiceNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName: keyof ProcessorDefinition = 'choice';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(path, data);

    const whenNodes = this.getChildrenFromArrayClause(`${path}.when`, entityDefinition);
    whenNodes.forEach((whenNode) => {
      vizNode.addChild(whenNode);
    });

    const otherwiseNode = this.getChildrenFromSingleClause(`${path}.otherwise`, entityDefinition);
    if (otherwiseNode.length > 0) {
      vizNode.addChild(otherwiseNode[0]);
    }

    return vizNode;
  }
}
