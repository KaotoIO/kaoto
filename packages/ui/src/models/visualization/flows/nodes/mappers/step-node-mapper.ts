import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX, getValue } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { BaseNodeMapper } from './base-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';

export class StepNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'step';

    const data: IVisualizationNodeData = {
      name: processorName,
      path,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    };

    const stepDefinition: Step = getValue(entityDefinition, path);
    if (DataMapperNodeMapper.isDataMapperNode(stepDefinition)) {
      return this.rootNodeMapper.getVizNodeFromProcessor(
        path,
        { primaryNodeId: { name: DATAMAPPER_ID_PREFIX, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity },
        entityDefinition,
      );
    }

    const vizNode = createVisualizationNode(path, data);

    const children = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
    });

    return vizNode;
  }
}
