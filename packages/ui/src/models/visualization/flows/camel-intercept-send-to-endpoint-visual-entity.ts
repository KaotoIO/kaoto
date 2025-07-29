import { InterceptSendToEndpoint, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver, NodeIconType, isDefined } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import {
  BaseVisualCamelEntity,
  IVisualizationNodeData,
  NodeInteraction,
  VizNodesWithEdges,
} from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from './support/camel-component-types';
import { NodeMapperService } from './nodes/node-mapper.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export class CamelInterceptSendToEndpointVisualEntity
  extends AbstractCamelVisualEntity<{ interceptSendToEndpoint: InterceptSendToEndpoint }>
  implements BaseVisualCamelEntity
{
  id: string;
  interceptSendToEndpointDef: { interceptSendToEndpoint: Exclude<InterceptSendToEndpoint, string> };
  readonly type = EntityType.InterceptSendToEndpoint;
  static readonly ROOT_PATH = 'interceptSendToEndpoint';

  constructor(
    interceptSendToEndpointRaw: { interceptSendToEndpoint: InterceptSendToEndpoint } = { interceptSendToEndpoint: {} },
  ) {
    let interceptSendToEndpointDef: { interceptSendToEndpoint: Exclude<InterceptSendToEndpoint, string> };
    if (typeof interceptSendToEndpointRaw.interceptSendToEndpoint === 'string') {
      interceptSendToEndpointDef = {
        interceptSendToEndpoint: {
          id: getCamelRandomId(CamelInterceptSendToEndpointVisualEntity.ROOT_PATH),
          uri: interceptSendToEndpointRaw.interceptSendToEndpoint,
        },
      };
    } else {
      interceptSendToEndpointDef = { interceptSendToEndpoint: interceptSendToEndpointRaw.interceptSendToEndpoint };
    }

    super(interceptSendToEndpointDef);
    this.interceptSendToEndpointDef = interceptSendToEndpointDef;
    const id =
      interceptSendToEndpointDef.interceptSendToEndpoint.id ??
      getCamelRandomId(CamelInterceptSendToEndpointVisualEntity.ROOT_PATH);
    this.id = id;
    this.interceptSendToEndpointDef.interceptSendToEndpoint.id = id;
  }

  static isApplicable(
    interceptSendToEndpointDef: unknown,
  ): interceptSendToEndpointDef is { interceptSendToEndpoint: InterceptSendToEndpoint } {
    if (
      !isDefined(interceptSendToEndpointDef) ||
      Array.isArray(interceptSendToEndpointDef) ||
      typeof interceptSendToEndpointDef !== 'object'
    ) {
      return false;
    }

    const objectKeys = Object.keys(interceptSendToEndpointDef!);

    return (
      objectKeys.length === 1 &&
      this.ROOT_PATH in interceptSendToEndpointDef! &&
      (typeof interceptSendToEndpointDef.interceptSendToEndpoint === 'object' ||
        typeof interceptSendToEndpointDef.interceptSendToEndpoint === 'string')
    );
  }

  getRootPath(): string {
    return CamelInterceptSendToEndpointVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.interceptSendToEndpointDef.interceptSendToEndpoint.id = id;
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      (data as CamelRouteVisualEntityData).processorName as keyof ProcessorDefinition,
    );
    const canHavePreviousStep = CamelComponentSchemaService.canHavePreviousStep(
      (data as CamelRouteVisualEntityData).processorName,
    );
    const canHaveChildren = stepsProperties.find((property) => property.type === 'branch') !== undefined;
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;
    const canReplaceStep = data.path !== CamelInterceptSendToEndpointVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelInterceptSendToEndpointVisualEntity.ROOT_PATH;
    const canBeDisabled = CamelComponentSchemaService.canBeDisabled((data as CamelRouteVisualEntityData).processorName);

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelInterceptSendToEndpointVisualEntity.ROOT_PATH,
      canBeDisabled,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): VizNodesWithEdges {
    const interceptSendToEndpointGroupNode = NodeMapperService.getVizNode(
      CamelInterceptSendToEndpointVisualEntity.ROOT_PATH,
      { processorName: CamelInterceptSendToEndpointVisualEntity.ROOT_PATH as keyof ProcessorDefinition },
      this.interceptSendToEndpointDef,
    );
    interceptSendToEndpointGroupNode.nodes[0].data.entity = this;
    interceptSendToEndpointGroupNode.nodes[0].data.isGroup = true;
    interceptSendToEndpointGroupNode.nodes[0].data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.Entity);

    return interceptSendToEndpointGroupNode;
  }

  toJSON(): { interceptSendToEndpoint: InterceptSendToEndpoint } {
    return { interceptSendToEndpoint: this.interceptSendToEndpointDef.interceptSendToEndpoint };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
