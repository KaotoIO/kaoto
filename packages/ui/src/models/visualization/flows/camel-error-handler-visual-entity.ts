import { ErrorHandlerDeserializer, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getValue, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { IClipboardCopyObject } from '../clipboard';
import { CamelCatalogService } from './camel-catalog.service';
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
    return {
      type: SourceSchemaType.Route,
      name: CamelErrorHandlerVisualEntity.ROOT_PATH,
      definition: this.errorHandlerDef.errorHandler,
    };
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

  removeStep(): void {
    return;
  }

  getNodeSchema(): KaotoSchemaDefinition['schema'] {
    const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'errorHandler');
    return schema?.propertiesSchema ?? {};
  }

  getNodeDefinition(): unknown {
    return { ...this.errorHandlerDef.errorHandler };
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

  isVerified(_path?: string): boolean | undefined {
    return undefined;
  }

  hasMessage(_path?: string): boolean | undefined {
    return undefined;
  }

  getMessage(_path?: string): Record<string, unknown> | undefined {
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
    errorHandlerGroupNode.data.catalogKind = CatalogKind.Entity;
    errorHandlerGroupNode.data.name = this.type;

    return errorHandlerGroupNode;
  }

  toJSON(): { errorHandler: ErrorHandlerDeserializer } {
    return { errorHandler: this.errorHandlerDef.errorHandler };
  }

  getGroupIcons(): { icon: string; title: string }[] {
    return [];
  }
}
