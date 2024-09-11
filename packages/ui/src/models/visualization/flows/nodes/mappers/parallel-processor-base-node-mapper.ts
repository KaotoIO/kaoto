import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';

export abstract class ParallelProcessorBaseNodeMapper extends BaseNodeMapper {
  abstract getProcessorName(): keyof ProcessorDefinition;

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = this.getProcessorName();

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName,
      isGroup: true,
    };

    const vizNode = createVisualizationNode(processorName, data);
    const children = this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    children.forEach((child) => {
      vizNode.addChild(child);
      /**
       * Remove the previous and next node from the child to prevent
       * edges between the children nodes of the Parallel processor
       */
      child.setPreviousNode(undefined);
      child.setNextNode(undefined);
      // adding child node interaction where child cannot append/prepend steps
      this.addNodeInteraction(child);
    });

    return vizNode;
  }

  addNodeInteraction(vizNode: IVisualizationNode): void {
    const processorName = (vizNode.data as CamelRouteVisualEntityData).processorName;
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(processorName);
    const canHaveChildren = stepsProperties.find((property) => property.type === 'branch') !== undefined;
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;
    const canReplaceStep = CamelComponentSchemaService.canReplaceStep(processorName);
    const canRemoveStep = !CamelComponentSchemaService.DISABLED_REMOVE_STEPS.includes(processorName);
    const canBeDisabled = CamelComponentSchemaService.canBeDisabled(processorName);

    vizNode.setNodeInteraction({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canRemoveFlow: false,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canBeDisabled,
    });
  }
}
