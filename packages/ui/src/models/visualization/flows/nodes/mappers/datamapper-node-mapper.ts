import { Step } from '@kaoto/camel-catalog/types';
import { DATAMAPPER_ID_PREFIX, isDataMapperNode } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
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
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName: DATAMAPPER_ID_PREFIX,
      isGroup: false,
    };

    const vizNode = createVisualizationNode(processorName, data);
    vizNode.setTitle('Kaoto data mapper');

    return vizNode;
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    return isDataMapperNode(stepDefinition);
  }
}
