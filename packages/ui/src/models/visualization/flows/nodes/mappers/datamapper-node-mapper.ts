import { Step } from '@kaoto/camel-catalog/types';
import { DATAMAPPER_ID_PREFIX, isDataMapperNode } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class DataMapperNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    _entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName = DATAMAPPER_ID_PREFIX;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName: DATAMAPPER_ID_PREFIX,
      isGroup: false,
    };

    return { nodes: [createVisualizationNode(path + ':' + processorName, data)], edges: [] };
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    return isDataMapperNode(stepDefinition);
  }
}
