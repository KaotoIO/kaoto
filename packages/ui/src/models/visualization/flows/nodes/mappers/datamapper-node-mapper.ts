import { Step } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX, isDataMapperNode } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { BaseNodeMapper } from './base-node-mapper';

export class DataMapperNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: IVisualizationNodeIds,
    _entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName = DATAMAPPER_ID_PREFIX;

    const data: IVisualizationNodeData = {
      name: processorName,
      path,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path + ':' + processorName, data);
    return vizNode;
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    return isDataMapperNode(stepDefinition);
  }
}
