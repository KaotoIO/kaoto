import { ErrorHandlerDeserializer, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { SchemaService } from '../../../components/Form/schema.service';
import { useSchemasStore } from '../../../store';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { NodeMapperService } from './nodes/node-mapper.service';

export class CamelErrorHandlerVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.ErrorHandler;
  static readonly ROOT_PATH = 'errorHandler';

  constructor(public errorHandlerDef: { errorHandler: ErrorHandlerDeserializer } = { errorHandler: {} }) {
    const id = getCamelRandomId('errorHandler');
    this.id = id;
  }

  static isApplicable(errorHandlerDef: unknown): errorHandlerDef is { errorHandler: ErrorHandlerDeserializer } {
    if (!isDefined(errorHandlerDef) || Array.isArray(errorHandlerDef) || typeof errorHandlerDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(errorHandlerDef!);

    return (
      objectKeys.length === 1 && 'errorHandler' in errorHandlerDef! && typeof errorHandlerDef.errorHandler === 'object'
    );
  }

  getRootPath(): string {
    return CamelErrorHandlerVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getNodeLabel(): string {
    const deadLetterChannelId: string | undefined = getValue(this.errorHandlerDef.errorHandler, 'deadLetterChannel.id');
    const defaultErrorHandlerId: string | undefined = getValue(
      this.errorHandlerDef.errorHandler,
      'defaultErrorHandler.id',
    );
    const jtaTransactionErrorHandlerId: string | undefined = getValue(
      this.errorHandlerDef.errorHandler,
      'jtaTransactionErrorHandler.id',
    );
    const noErrorHandlerId: string | undefined = getValue(this.errorHandlerDef.errorHandler, 'noErrorHandler.id');
    const refErrorHandlerId: string | undefined = getValue(this.errorHandlerDef.errorHandler, 'refErrorHandler.id');
    const springTransactionErrorHandlerId: string | undefined = getValue(
      this.errorHandlerDef.errorHandler,
      'springTransactionErrorHandler.id',
    );

    let errorHandlerId =
      deadLetterChannelId ??
      defaultErrorHandlerId ??
      jtaTransactionErrorHandlerId ??
      noErrorHandlerId ??
      refErrorHandlerId ??
      springTransactionErrorHandlerId;

    if (!errorHandlerId?.trim()) errorHandlerId = 'errorHandler';
    return errorHandlerId;
  }

  getTooltipContent(): string {
    return 'errorHandler';
  }

  addStep(): void {
    return;
  }

  isDraggableNode(_path?: string | undefined) {
    return false;
  }

  switchSteps(_options: { draggedNodePath: string; droppedNodePath?: string | undefined }) {
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
    };
  }

  getOmitFormFields(): string[] {
    return SchemaService.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.errorHandlerDef, path, value);

    if (!isDefined(this.errorHandlerDef.errorHandler)) {
      this.errorHandlerDef.errorHandler = {};
    }
  }

  getNodeInteraction(): NodeInteraction {
    return {
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: false,
    };
  }

  getNodeValidationText(): string | undefined {
    return undefined;
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const errorHandlerGroupNode = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: 'errorHandler' as keyof ProcessorDefinition },
      this.errorHandlerDef,
    );
    errorHandlerGroupNode.data.entity = this;
    errorHandlerGroupNode.data.isGroup = true;
    errorHandlerGroupNode.data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity);
    errorHandlerGroupNode.setTitle('Error Handler');

    return errorHandlerGroupNode;
  }

  toJSON(): { errorHandler: ErrorHandlerDeserializer } {
    return { errorHandler: this.errorHandlerDef.errorHandler };
  }
}
