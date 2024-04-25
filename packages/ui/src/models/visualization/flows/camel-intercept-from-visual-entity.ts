import { InterceptFrom, ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { isDefined } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from './support/camel-component-types';
import { CamelStepsService } from './support/camel-steps.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export class CamelInterceptFromVisualEntity
  extends AbstractCamelVisualEntity<{ interceptFrom: InterceptFrom }>
  implements BaseVisualCamelEntity
{
  id: string;
  interceptFromDef: { interceptFrom: Exclude<InterceptFrom, string> };
  readonly type = EntityType.InterceptFrom;
  static readonly ROOT_PATH = 'interceptFrom';

  constructor(interceptFromRaw: { interceptFrom: InterceptFrom } = { interceptFrom: {} }) {
    let interceptFromDef: { interceptFrom: Exclude<InterceptFrom, string> };
    if (typeof interceptFromRaw.interceptFrom === 'string') {
      interceptFromDef = {
        interceptFrom: {
          uri: interceptFromRaw.interceptFrom,
        },
      };
    } else {
      interceptFromDef = { interceptFrom: interceptFromRaw.interceptFrom };
    }

    super(interceptFromDef);
    this.interceptFromDef = interceptFromDef;
    const id = interceptFromDef.interceptFrom.id ?? getCamelRandomId(CamelInterceptFromVisualEntity.ROOT_PATH);
    this.id = id;
    this.interceptFromDef.interceptFrom.id = id;
  }

  static isApplicable(interceptFromDef: unknown): interceptFromDef is { interceptFrom: InterceptFrom } {
    if (!isDefined(interceptFromDef) || Array.isArray(interceptFromDef) || typeof interceptFromDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(interceptFromDef!);

    return (
      objectKeys.length === 1 &&
      this.ROOT_PATH in interceptFromDef! &&
      (typeof interceptFromDef.interceptFrom === 'object' || typeof interceptFromDef.interceptFrom === 'string')
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.interceptFromDef.interceptFrom.id = id;
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
    const canReplaceStep = data.path !== CamelInterceptFromVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelInterceptFromVisualEntity.ROOT_PATH;

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelInterceptFromVisualEntity.ROOT_PATH,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const interceptFromGroupNode = CamelStepsService.getVizNodeFromProcessor(
      CamelInterceptFromVisualEntity.ROOT_PATH,
      { processorName: CamelInterceptFromVisualEntity.ROOT_PATH as keyof ProcessorDefinition },
      this.interceptFromDef,
    );
    interceptFromGroupNode.data.entity = this;
    interceptFromGroupNode.data.isGroup = true;

    return interceptFromGroupNode;
  }

  toJSON(): { interceptFrom: InterceptFrom } {
    return { interceptFrom: this.interceptFromDef.interceptFrom };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
