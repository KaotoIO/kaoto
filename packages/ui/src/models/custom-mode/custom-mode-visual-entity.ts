import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { DefinedComponent } from '../camel/camel-catalog-index';
import { EntityType } from '../entities';
import { KaotoSchemaDefinition } from '../kaoto-schema';
import { NodeLabelType } from '../settings/settings.model';
import {
  AddStepMode,
  BaseVisualEntity,
  DISABLED_NODE_INTERACTION,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../visualization/base-visual-entity';
import { IClipboardCopyObject } from '../visualization/clipboard';
import { CustomMode } from './custom-mode-types';

/**
 * Minimal shell for Epic 1. Methods required by BaseVisualEntity but not yet
 * implemented return safe no-op values. toVizNode() is implemented in Epic 2.
 */
export class CustomModeVisualEntity implements BaseVisualEntity {
  readonly type = EntityType.CustomMode;
  id: string;

  constructor(private readonly mode: CustomMode) {
    this.id = getCamelRandomId('custom-mode');
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  toJSON(): CustomMode {
    return this.mode;
  }

  getRootPath(): string {
    return 'customMode';
  }

  getNodeLabel(_path?: string, _labelType?: NodeLabelType): string {
    return this.mode.slug;
  }

  getNodeSchema(_path?: string): KaotoSchemaDefinition['schema'] | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNodeDefinition(_path?: string): any {
    return this.mode;
  }

  getOmitFormFields(): string[] {
    return [];
  }

  updateModel(_path: string | undefined, _value: unknown): void {
    // no-op — Epic 2
  }

  addStep(_options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
    insertAtStart?: boolean;
  }): void {
    // no-op — Epic 2
  }

  getCopiedContent(_path?: string): IClipboardCopyObject | undefined {
    return undefined;
  }

  pasteStep(_options: {
    clipboardContent: IClipboardCopyObject;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    insertAtStart?: boolean;
  }): void {
    // no-op — Epic 2
  }

  canDragNode(_path?: string): boolean {
    return false;
  }

  canDropOnNode(_path?: string): boolean {
    return false;
  }

  removeStep(_path?: string): void {
    // no-op — Epic 2
  }

  getNodeInteraction(_data: IVisualizationNodeData): NodeInteraction {
    return DISABLED_NODE_INTERACTION;
  }

  getNodeValidationText(_path?: string): string | undefined {
    return undefined;
  }

  async toVizNode(): Promise<IVisualizationNode> {
    throw new Error('CustomModeVisualEntity.toVizNode() — not implemented until Epic 2');
  }
}
