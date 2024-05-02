import { Intercept, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver, NodeIconType, isDefined } from '../../../utils';
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

export class CamelInterceptVisualEntity
  extends AbstractCamelVisualEntity<{ intercept: Intercept }>
  implements BaseVisualCamelEntity
{
  id: string;
  readonly type = EntityType.Intercept;
  static readonly ROOT_PATH = 'intercept';

  constructor(public interceptDef: { intercept: Intercept } = { intercept: {} }) {
    super(interceptDef);
    const id = interceptDef.intercept.id ?? getCamelRandomId(CamelInterceptVisualEntity.ROOT_PATH);
    this.id = id;
    this.interceptDef.intercept.id = id;
  }

  static isApplicable(interceptDef: unknown): interceptDef is { intercept: Intercept } {
    if (!isDefined(interceptDef) || Array.isArray(interceptDef) || typeof interceptDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(interceptDef!);

    return objectKeys.length === 1 && this.ROOT_PATH in interceptDef! && typeof interceptDef.intercept === 'object';
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.interceptDef.intercept.id = id;
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
    const canReplaceStep = data.path !== CamelInterceptVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelInterceptVisualEntity.ROOT_PATH;

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelInterceptVisualEntity.ROOT_PATH,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const interceptGroupNode = CamelStepsService.getVizNodeFromProcessor(
      CamelInterceptVisualEntity.ROOT_PATH,
      { processorName: CamelInterceptVisualEntity.ROOT_PATH as keyof ProcessorDefinition },
      this.interceptDef,
    );
    interceptGroupNode.data.entity = this;
    interceptGroupNode.data.isGroup = true;
    interceptGroupNode.data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity);

    return interceptGroupNode;
  }

  toJSON(): { intercept: Intercept } {
    return { intercept: this.interceptDef.intercept };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
