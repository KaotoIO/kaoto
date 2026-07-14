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
import { CustomInstructionsParser } from './custom-instructions-parser';
import { CustomInstructionsNode, CustomMode } from './custom-mode-types';

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
    this.parsedNodes = CustomInstructionsParser.parseAll(mode?.customInstructions ?? '').steps;
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
      // Exclude customInstructions (managed via canvas nodes) from the form.
      const { customInstructions: _ci, ...rest } = this.mode as CustomMode & { customInstructions?: string };
      return rest;
    }
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const index = Number(path.replace(`${this.getRootPath()}.customInstructions.`, '').split('.')[0]);
      if (!Number.isInteger(index)) return undefined;
      const node = this.parsedNodes[index];
      if (!node) return undefined;
      // Project CustomInstructionsNode onto the text-node catalog schema shape.
      return { content: node.rawContent, label: node.title, order: node.index };
    }
    return undefined;
  }

  getOmitFormFields(): string[] {
    // customInstructions is managed via the canvas step nodes.
    // hardRules is hidden from the user (static text, always re-injected on serialize).
    return ['customInstructions', 'hardRules'];
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
        // The form submits the catalog shape { content, label, order }.
        // Reverse-map back to CustomInstructionsNode before persisting.
        const formValue = value as { content?: string; label?: string; order?: number };
        const existing = this.parsedNodes[index];
        this.parsedNodes[index] = {
          nodeType: existing.nodeType,
          rawContent: formValue.content ?? existing.rawContent,
          title: formValue.label ?? existing.title,
          index: typeof formValue.order === 'number' ? formValue.order : existing.index,
        };
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
    return { ...DISABLED_NODE_INTERACTION, canRemoveFlow: data.path === this.getRootPath() };
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

    await NodeEnrichmentService.enrichNodeFromCatalog(modeGroupNode, CatalogKind.Entity);

    // Catalog title takes priority; fall back to mode.name when catalog is absent.
    if (!modeGroupNode.data.title) {
      modeGroupNode.data.title = this.mode.name || this.id;
    }

    // 2. customInstructions step nodes — one per parsed instruction step.
    // title and index are populated by CustomInstructionsParser.parseAll().
    // node.nodeType is looked up in the BobComponent catalog for icon/title enrichment.
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
        title: node.title ?? node.nodeType,
        description: node.rawContent,
      });
      await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.BobComponent);
      // Parsed title takes priority over whatever the catalog returns for the generic type.
      if (node.title) {
        vizNode.data.title = node.title;
      }
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
