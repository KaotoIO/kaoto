import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';

export class StepNodeMapper extends BaseNodeMapper {
  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
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
          processorName: DataMapperNodeMapper.DATAMAPPER_ID_PREFIX,
        },
        entityDefinition,
      );
    }

    const vizNode = createVisualizationNode(processorName, data);

    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
    });

    return vizNode;
  }
}
