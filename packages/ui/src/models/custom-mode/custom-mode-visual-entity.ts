import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { DefinedComponent } from '../camel/camel-catalog-index';
import { SourceSchemaType } from '../camel/source-schema-type';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
import { KaotoSchemaDefinition } from '../kaoto-schema';
import { NodeLabelType } from '../settings/settings.model';
import {
  AddStepMode,
  BaseVisualEntity,
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
      // Tool-invocation nodes: parse sub-bullets into a key→value record matching
      // the tool's propertiesSchema so form fields are populated correctly.
      if (node.nodeType === 'tool-invocation') {
        return CustomInstructionsParser.parseToolParams(node.rawContent);
      }
      // Ordinary step nodes: use the text-node catalog schema shape.
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
        const existing = this.parsedNodes[index];
        if (existing.nodeType === 'tool-invocation' && isDefined(existing.toolName)) {
          // Tool-invocation form submits a key→value record matching the tool's schema.
          // Re-serialize it into the **toolName** + bullet-list rawContent format.
          const params = value as Record<string, string>;
          this.parsedNodes[index] = {
            nodeType: 'tool-invocation',
            rawContent: CustomInstructionsParser.serializeToolParams(existing.toolName, params),
            title: existing.toolName,
            index: existing.index,
            toolName: existing.toolName,
          };
        } else {
          // Ordinary step: the form submits the text-node catalog shape { content, label, order }.
          const formValue = value as { content?: string; label?: string; order?: number };
          this.parsedNodes[index] = {
            nodeType: existing.nodeType,
            rawContent: formValue.content ?? existing.rawContent,
            title: formValue.label ?? existing.title,
            index: typeof formValue.order === 'number' ? formValue.order : existing.index,
          };
        }
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
    const isRoot = data.path === this.getRootPath();
    const isStep = !isRoot && isDefined(data.path) && !data.path.endsWith('.placeholder');
    return {
      canHavePreviousStep: isStep,
      canHaveNextStep: isStep,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canReplaceStep: isStep,
      canRemoveStep: isStep,
      canRemoveFlow: isRoot,
      canBeDisabled: false,
    };
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

  getCopiedContent(path?: string): IClipboardCopyObject | undefined {
    if (!path) return undefined;
    const index = this.extractStepIndex(path);
    if (index === -1 || !this.parsedNodes[index]) return undefined;

    const node = this.parsedNodes[index];
    return {
      type: SourceSchemaType.CustomMode,
      name: node.title,
      definition: { ...node },
    };
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
    insertAtStart?: boolean;
  }): void {
    const index = this.extractStepIndex(options.data.path ?? '');
    if (index === -1) return;

    const newNode: CustomInstructionsNode = {
      nodeType: 'step',
      title: options.definedComponent.name,
      rawContent: options.definedComponent.name,
      index: 0,
    };

    if (options.mode === AddStepMode.PrependStep) {
      this.parsedNodes.splice(index, 0, newNode);
    } else if (options.mode === AddStepMode.ReplaceStep) {
      this.parsedNodes.splice(index, 1, newNode);
    } else {
      // AppendStep and InsertChildStep both insert after the target index
      this.parsedNodes.splice(index + 1, 0, newNode);
    }

    this.reindexNodes();
    this.parsedNodesDirty = true;
  }

  removeStep(path?: string): void {
    if (!path) return;
    const index = this.extractStepIndex(path);
    if (index === -1) return;

    this.parsedNodes.splice(index, 1);
    this.reindexNodes();
    this.parsedNodesDirty = true;
  }

  pasteStep(options: {
    clipboardContent: IClipboardCopyObject;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    insertAtStart?: boolean;
  }): void {
    const index = this.extractStepIndex(options.data.path ?? '');
    if (index === -1) return;

    const cloned = { ...(options.clipboardContent.definition as CustomInstructionsNode) };

    if (options.mode === AddStepMode.PrependStep) {
      this.parsedNodes.splice(index, 0, cloned);
    } else if (options.mode === AddStepMode.ReplaceStep) {
      this.parsedNodes.splice(index, 1, cloned);
    } else {
      this.parsedNodes.splice(index + 1, 0, cloned);
    }

    this.reindexNodes();
    this.parsedNodesDirty = true;
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
    // For 'tool-invocation' nodes, the catalog key is the tool name (BobTool catalog).
    // For 'step' nodes, the catalog key is the nodeType (BobComponent catalog).
    const siblings: IVisualizationNode[] = [];
    for (let i = 0; i < this.parsedNodes.length; i++) {
      const node = this.parsedNodes[i];
      const isToolInvocation = node.nodeType === 'tool-invocation';
      const catalogKey = isToolInvocation ? (node.toolName ?? node.nodeType) : node.nodeType;
      const catalogKind = isToolInvocation ? CatalogKind.BobTool : CatalogKind.BobComponent;
      const path = `${this.getRootPath()}.customInstructions.${i}.${catalogKey}`;
      const vizNode = createVisualizationNode(path, {
        name: catalogKey,
        path,
        entity: this,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: node.title ?? catalogKey,
        description: node.rawContent,
      });
      await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, catalogKind);
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
  private extractStepIndex(path: string): number {
    const prefix = `${this.getRootPath()}.customInstructions.`;
    if (!path.startsWith(prefix)) return -1;
    const index = Number(path.replace(prefix, '').split('.')[0]);
    return Number.isInteger(index) && !Number.isNaN(index) ? index : -1;
  }

  private reindexNodes(): void {
    this.parsedNodes.forEach((node, i) => {
      node.index = i + 1;
    });
  }
}
