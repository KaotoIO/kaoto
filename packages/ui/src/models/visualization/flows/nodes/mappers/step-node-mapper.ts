import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';
import { DATAMAPPER_ID_PREFIX, getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodesWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';

export class StepNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const processorName: keyof ProcessorDefinition = 'step';

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const stepDefinition: Step = getValue(entityDefinition, path);
    if (DataMapperNodeMapper.isDataMapperNode(stepDefinition)) {
      return this.rootNodeMapper.getVizNodeFromProcessor(
        path,
        {
          processorName: DATAMAPPER_ID_PREFIX,
        },
        entityDefinition,
      );
    }

    const vizNode = createVisualizationNode(processorName, data);

    const { nodes, edges } = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    nodes.forEach((child) => {
      vizNode.addChild(child);
    });

    return { nodes: [vizNode], edges };
  }
}
