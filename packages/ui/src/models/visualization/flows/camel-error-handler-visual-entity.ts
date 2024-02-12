import { ErrorHandler, ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { useSchemasStore } from '../../../store';
import { isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { CamelStepsService } from './support/camel-steps.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export class CamelErrorHandlerVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.ErrorHandler;

  constructor(public errorHandlerDef: { errorHandler: ErrorHandler }) {
    const id = getCamelRandomId('errorHandler');
    this.id = id;
  }

  static isApplicable(onExceptionDef: unknown): onExceptionDef is { onException: ErrorHandler } {
    if (!isDefined(onExceptionDef) || Array.isArray(onExceptionDef) || typeof onExceptionDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(onExceptionDef!);

    return (
      objectKeys.length === 1 && 'errorHandler' in onExceptionDef! && typeof onExceptionDef.errorHandler === 'object'
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getNodeLabel(): string {
    return 'errorHandler';
  }

  getTooltipContent(): string {
    return 'errorHandler';
  }

  addStep(): void {
    return;
  }

  removeStep(): void {
    return;
  }

  getComponentSchema(): VisualComponentSchema {
    const schema = useSchemasStore.getState().schemas['errorHandler'].schema;

    return {
      definition: Object.assign({}, this.errorHandlerDef.errorHandler),
      schema: schema,
      title: 'Error Handler',
    };
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.errorHandlerDef, path, value);
  }

  getNodeInteraction(): NodeInteraction {
    return {
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
    };
  }

  getNodeValidationText(): string | undefined {
    const componentVisualSchema = this.getComponentSchema();
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const errorHandlerGroupNode = CamelStepsService.getVizNodeFromProcessor(
      'errorHandler',
      { processorName: 'errorHandler' as keyof ProcessorDefinition },
      this.errorHandlerDef,
    );
    errorHandlerGroupNode.data.entity = this;
    errorHandlerGroupNode.data.isGroup = true;

    return errorHandlerGroupNode;
  }

  toJSON(): unknown {
    return this.errorHandlerDef;
  }
}
