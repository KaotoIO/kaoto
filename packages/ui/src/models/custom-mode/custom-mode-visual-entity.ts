import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { DefinedComponent } from '../camel/camel-catalog-index';
import { CatalogKind } from '../catalog-kind';
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
import { NodeEnrichmentService } from '../visualization/flows/nodes/node-enrichment.service';
import { CustomModeSchemaService } from '../visualization/flows/support/custom-mode-schema.service';
import { createVisualizationNode } from '../visualization/visualization-node';
import { CustomInstructionsNode, CustomInstructionsParser } from './custom-instructions-parser';
import { CustomMode } from './custom-mode-types';

export class CustomModeVisualEntity implements BaseVisualEntity {
  id: string;
  readonly type = EntityType.CustomMode;
  static readonly ROOT_PATH = 'customMode';

  private parsedNodes: CustomInstructionsNode[] = [];
  private parsedNodesDirty = false;

  constructor(private readonly mode: CustomMode) {
    if (isDefined(mode?.slug) && mode.slug !== '') {
      this.id = mode.slug;
    } else {
      this.id = getCamelRandomId('custom-mode');
      this.mode.slug = this.id;
    }
    this.parsedNodes = CustomInstructionsParser.parse(mode?.customInstructions ?? '');
  }

  static isApplicable(entity: unknown): entity is CustomMode {
    if (!isDefined(entity) || Array.isArray(entity) || typeof entity !== 'object') return false;
    return 'slug' in entity && 'name' in entity && 'groups' in entity;
  }

  getRootPath(): string {
    return CustomModeVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(slug: string): void {
    this.id = slug;
    this.mode.slug = slug;
  }

  getNodeLabel(path?: string, _labelType?: NodeLabelType): string {
    if (!path) return '';
    if (path === this.getRootPath()) return this.mode.name || this.id;
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      return path.split('.').pop() ?? '';
    }
    return '';
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (!path) return undefined;
    if (path === this.getRootPath()) return CustomModeSchemaService.getRootSchema();
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      return CustomModeSchemaService.getNodeSchema(path.split('.').pop() ?? '');
    }
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNodeDefinition(path?: string): any {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      const { customInstructions: _ci, ...rest } = this.mode as CustomMode & { customInstructions?: string };
      return rest;
    }
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const index = Number(path.replace(`${this.getRootPath()}.customInstructions.`, '').split('.')[0]);
      return Number.isInteger(index) ? this.parsedNodes[index] : undefined;
    }
    return undefined;
  }

  getOmitFormFields(): string[] {
    return ['customInstructions'];
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;
    if (path === this.getRootPath()) {
      Object.assign(this.mode, value);
      this.id = isDefined(this.mode.slug) && this.mode.slug !== '' ? this.mode.slug : this.id;
      return;
    }
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const index = Number(path.replace(`${this.getRootPath()}.customInstructions.`, '').split('.')[0]);
      if (Number.isInteger(index) && isDefined(this.parsedNodes[index])) {
        this.parsedNodes[index] = value as CustomInstructionsNode;
        this.parsedNodesDirty = true;
      }
    }
  }

  toJSON(): CustomMode {
    if (this.parsedNodesDirty) {
      this.mode.customInstructions = CustomInstructionsParser.serialize(this.parsedNodes);
      this.parsedNodesDirty = false;
    }
    return this.mode;
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const isModeNode = data.path === this.getRootPath() && !data.isGroup;
    return { ...DISABLED_NODE_INTERACTION, canRemoveFlow: isModeNode };
  }

  getNodeValidationText(_path?: string): string | undefined {
    return undefined;
  }

  canDragNode(_path?: string): boolean {
    return false;
  }

  canDropOnNode(_path?: string): boolean {
    return false;
  }

  getCopiedContent(_path?: string): IClipboardCopyObject | undefined {
    return undefined;
  }

  /** No-op — deferred to drag-and-drop epic. */
  addStep(_options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
    insertAtStart?: boolean;
  }): void {
    // TODO: drag-and-drop epic
  }

  /** No-op — deferred to drag-and-drop epic. */
  removeStep(_path?: string): void {
    // TODO: drag-and-drop epic
  }

  /** No-op — deferred to drag-and-drop epic. */
  pasteStep(_options: {
    clipboardContent: IClipboardCopyObject;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    insertAtStart?: boolean;
  }): void {
    // TODO: drag-and-drop epic
  }

  async toVizNode(): Promise<IVisualizationNode> {
    // 1. Mode group node — carries the title; clicking it opens the metadata form.
    //    Title is left empty here so enrichNodeFromCatalog can populate it from the catalog (Epic 6).
    //    A post-enrichment fallback sets mode.name when the catalog has no entry.
    const modeGroupNode = createVisualizationNode(this.id, {
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: this.mode.description || '',
    });

    await NodeEnrichmentService.enrichNodeFromCatalog(modeGroupNode, CatalogKind.BobTool);

    // Catalog title takes priority; fall back to mode.name when BobNodes catalog is absent (pre-Epic 6).
    if (!modeGroupNode.data.title) {
      modeGroupNode.data.title = this.mode.name || this.id;
    }

    // 2. customInstructions sibling nodes (stub: parsedNodes is always [] until Epic 7)
    const siblings: IVisualizationNode[] = [];
    for (let i = 0; i < this.parsedNodes.length; i++) {
      const node = this.parsedNodes[i];
      const path = `${this.getRootPath()}.customInstructions.${i}.${node.nodeType}`;
      const vizNode = createVisualizationNode(path, {
        name: node.nodeType,
        path,
        entity: this,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: node.nodeType,
        description: '',
      });
      modeGroupNode.addChild(vizNode);
      siblings.push(vizNode);
    }

    // 4. Placeholder
    const placeholderPath = `${this.getRootPath()}.customInstructions.${this.parsedNodes.length}.placeholder`;
    const placeholderNode = createVisualizationNode(placeholderPath, {
      name: 'placeholder',
      path: placeholderPath,
      entity: this,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    modeGroupNode.addChild(placeholderNode);
    siblings.push(placeholderNode);

    // 5. Wire prev/next links across the flat sequence
    for (let i = 0; i < siblings.length - 1; i++) {
      siblings[i].setNextNode(siblings[i + 1]);
      siblings[i + 1].setPreviousNode(siblings[i]);
    }

    return modeGroupNode;
  }
}
