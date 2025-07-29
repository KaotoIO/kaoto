import { ErrorHandlerDeserializer, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import {
  BaseVisualCamelEntity,
  NodeInteraction,
  VisualComponentSchema,
  VizNodesWithEdges,
} from '../base-visual-entity';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';
import { IClipboardCopyObject } from '../../../components/Visualization/Custom/hooks/copy-step.hook';

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
    const id: string | undefined = getValue(this.errorHandlerDef.errorHandler, 'id');
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
      springTransactionErrorHandlerId ??
      id;

    if (!errorHandlerId?.trim()) errorHandlerId = 'errorHandler';
    return errorHandlerId;
  }

  getNodeTitle(): string {
    return 'Error Handler';
  }

  getTooltipContent(): string {
    return 'errorHandler';
  }

  addStep(): void {
    return;
  }

  getCopiedContent(): IClipboardCopyObject | undefined {
    return undefined;
  }

  pasteStep(): void {
    return;
  }

  canDragNode(_path?: string) {
    return false;
  }

  canDropOnNode(_path?: string) {
    return false;
  }

  moveNodeTo(_options: { draggedNodePath: string; droppedNodePath?: string }) {
    return;
  }

  removeStep(): void {
    return;
  }

  getComponentSchema(): VisualComponentSchema {
    const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'errorHandler');

    return {
      definition: Object.assign({}, this.errorHandlerDef.errorHandler),
      schema: schema?.propertiesSchema ?? {},
    };
  }

  getOmitFormFields(): string[] {
    return [];
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

  toVizNode(): VizNodesWithEdges {
    const errorHandlerGroupNode = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: 'errorHandler' as keyof ProcessorDefinition },
      this.errorHandlerDef,
    );
    errorHandlerGroupNode.nodes[0].data.entity = this;
    errorHandlerGroupNode.nodes[0].data.isGroup = true;
    errorHandlerGroupNode.nodes[0].data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.Entity);

    return errorHandlerGroupNode;
  }

  toJSON(): { errorHandler: ErrorHandlerDeserializer } {
    return { errorHandler: this.errorHandlerDef.errorHandler };
  }
}
