import { ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { BaseNodeMapper } from './base-node-mapper';

export class DataMapperNodeMapper extends BaseNodeMapper {
  static readonly DATAMAPPER_ID_PREFIX = 'kaoto-datamapper' as keyof ProcessorDefinition;
  static readonly XSLT_COMPONENT_NAME = 'xslt';

  getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    _entityDefinition: unknown,
  ): IVisualizationNode {
    const processorName = DataMapperNodeMapper.DATAMAPPER_ID_PREFIX;

    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(processorName, NodeIconType.EIP),
      processorName: DataMapperNodeMapper.DATAMAPPER_ID_PREFIX,
      isGroup: false,
    };

    return createVisualizationNode(processorName, data);
  }

  static isDataMapperNode(stepDefinition: Step): boolean {
    const isDatamapperId = this.isDatamapperId(stepDefinition);
    const doesContainXslt = this.doesContainXslt(stepDefinition);

    return isDatamapperId && doesContainXslt;
  }

  private static isDatamapperId(stepDefinition: Step): boolean {
    return stepDefinition.id?.startsWith(this.DATAMAPPER_ID_PREFIX) ?? false;
  }

  private static doesContainXslt(stepDefinition: Step): boolean {
    return (
      stepDefinition.steps?.some((step) => {
        if (typeof step.to === 'string') {
          return step.to.startsWith(this.XSLT_COMPONENT_NAME);
        }

        return step.to?.uri?.startsWith(this.XSLT_COMPONENT_NAME);
      }) ?? false
    );
  }
}
