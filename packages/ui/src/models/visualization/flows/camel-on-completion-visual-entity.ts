import { OnCompletion, ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
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

export class CamelOnCompletionVisualEntity
  extends AbstractCamelVisualEntity<{ onCompletion: OnCompletion }>
  implements BaseVisualCamelEntity
{
  id: string;
  readonly type = EntityType.OnCompletion;
  static readonly ROOT_PATH = 'onCompletion';

  constructor(public onCompletionDef: { onCompletion: OnCompletion }) {
    super(onCompletionDef);
    const id = onCompletionDef.onCompletion.id ?? getCamelRandomId(CamelOnCompletionVisualEntity.ROOT_PATH);
    this.id = id;
    this.onCompletionDef.onCompletion.id = id;
  }

  static isApplicable(onCompletionDef: unknown): onCompletionDef is { onCompletion: OnCompletion } {
    if (!isDefined(onCompletionDef) || Array.isArray(onCompletionDef) || typeof onCompletionDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(onCompletionDef!);

    return (
      objectKeys.length === 1 && this.ROOT_PATH in onCompletionDef! && typeof onCompletionDef.onCompletion === 'object'
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.onCompletionDef.onCompletion.id = id;
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
    const canReplaceStep = data.path !== CamelOnCompletionVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelOnCompletionVisualEntity.ROOT_PATH;

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelOnCompletionVisualEntity.ROOT_PATH,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const onCompletionGroupNode = CamelStepsService.getVizNodeFromProcessor(
      CamelOnCompletionVisualEntity.ROOT_PATH,
      { processorName: CamelOnCompletionVisualEntity.ROOT_PATH as keyof ProcessorDefinition },
      this.onCompletionDef,
    );
    onCompletionGroupNode.data.entity = this;
    onCompletionGroupNode.data.isGroup = true;

    return onCompletionGroupNode;
  }

  toJSON(): { onCompletion: OnCompletion } {
    return { onCompletion: this.onCompletionDef.onCompletion };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
