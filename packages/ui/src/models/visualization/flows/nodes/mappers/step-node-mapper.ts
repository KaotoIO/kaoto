import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';
import { DATAMAPPER_ID_PREFIX, getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';

export class StepNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
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

    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.nodes.forEach((child) => {
      vizNode.addChild(child);
    });

    return { vizNode, edges: children.edges };
  }
}
