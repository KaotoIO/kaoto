import { OnException, ProcessorDefinition } from '@kaoto/camel-catalog/types';
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

export class CamelOnExceptionVisualEntity
  extends AbstractCamelVisualEntity<{ onException: OnException }>
  implements BaseVisualCamelEntity
{
  id: string;
  readonly type = EntityType.OnException;
  private static readonly ROOT_PATH = 'onException';

  constructor(public onExceptionDef: { onException: OnException } = { onException: {} }) {
    super(onExceptionDef);
    const id = onExceptionDef.onException.id ?? getCamelRandomId(CamelOnExceptionVisualEntity.ROOT_PATH);
    this.id = id;
    this.onExceptionDef.onException.id = id;
  }

  static isApplicable(onExceptionDef: unknown): onExceptionDef is { onException: OnException } {
    if (!isDefined(onExceptionDef) || Array.isArray(onExceptionDef) || typeof onExceptionDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(onExceptionDef!);

    return (
      objectKeys.length === 1 && this.ROOT_PATH in onExceptionDef! && typeof onExceptionDef.onException === 'object'
    );
  }

  getRootPath(): string {
    return CamelOnExceptionVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.onExceptionDef.onException.id = id;
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
    const canReplaceStep = data.path !== CamelOnExceptionVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelOnExceptionVisualEntity.ROOT_PATH;
    const canBeDisabled = CamelComponentSchemaService.canBeDisabled((data as CamelRouteVisualEntityData).processorName);

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelOnExceptionVisualEntity.ROOT_PATH,
      canBeDisabled,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): VizNodesWithEdges {
    const onExceptionGroupNode = NodeMapperService.getVizNode(
      CamelOnExceptionVisualEntity.ROOT_PATH,
      { processorName: CamelOnExceptionVisualEntity.ROOT_PATH as keyof ProcessorDefinition },
      this.onExceptionDef,
    );
    onExceptionGroupNode.nodes[0].data.entity = this;
    onExceptionGroupNode.nodes[0].data.isGroup = true;
    onExceptionGroupNode.nodes[0].data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.Entity);

    return onExceptionGroupNode;
  }

  toJSON(): { onException: OnException } {
    return { onException: this.onExceptionDef.onException };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
