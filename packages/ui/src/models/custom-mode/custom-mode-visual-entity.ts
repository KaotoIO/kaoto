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
import { ModelValidationService } from '../visualization/flows/support/validators/model-validation.service';
import { createVisualizationNode } from '../visualization/visualization-node';
import { CustomInstructionsParser } from './custom-instructions-parser';
import { CustomModeGroupsService } from './custom-mode-groups.service';
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
      const index = this.extractStepIndex(path);
      const node = this.parsedNodes[index];
      if (!node) return '';
      return node.title;
    }
    return '';
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (!path) return undefined;
    if (path === this.getRootPath()) return CustomModeSchemaService.getRootSchema();
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const catalogKey = path.split('.').slice(3).join('.');
      return CustomModeSchemaService.getNodeSchema(catalogKey);
    }
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNodeDefinition(path?: string): any {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      // Exclude customInstructions (managed via canvas nodes) from the form.
      // Deep-clone groups so the form widget works on an independent copy.
      // Without this, sub-index paths (e.g. 'groups.0') in setValue() mutate
      // this.mode.groups in-place before our updateModel merge can read it.
      const { customInstructions: _ci, ...rest } = this.mode as CustomMode & { customInstructions?: string };
      return { ...rest, groups: Array.isArray(rest.groups) ? [...rest.groups] : rest.groups };
    }
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const index = this.extractStepIndex(path);
      if (index === -1) return undefined;
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
      const v = value as Partial<CustomMode>;
      // Explicitly pick only known CustomMode fields to prevent arbitrary key injection.
      // customInstructions is intentionally excluded — it is managed via canvas step nodes.
      // groups is merged (never replaced) — the form may add groups manually, but it must
      // not overwrite catalog-derived groups added by addStep. We union form-submitted groups
      // with the current groups so that: (a) manual additions via the form are accepted, and
      // (b) a stale form submission that lacks catalog-derived groups does not remove them.
      if (isDefined(v.slug)) this.mode.slug = v.slug;
      if (isDefined(v.name)) this.mode.name = v.name;
      if (isDefined(v.description)) this.mode.description = v.description;
      if (isDefined(v.roleDefinition)) this.mode.roleDefinition = v.roleDefinition;
      if (isDefined(v.whenToUse)) this.mode.whenToUse = v.whenToUse;
      if (Array.isArray(v.groups)) {
        const existing = new Set<string>(
          (this.mode.groups as string[]).filter((g): g is string => typeof g === 'string'),
        );
        for (const g of v.groups as string[]) {
          if (typeof g === 'string' && g.trim() !== '' && !existing.has(g)) {
            (this.mode.groups as string[]).push(g);
            existing.add(g);
          }
        }
      }
      this.id = isDefined(this.mode.slug) && this.mode.slug !== '' ? this.mode.slug : this.id;
      return;
    }
    if (path.startsWith(`${this.getRootPath()}.customInstructions.`)) {
      const index = this.extractStepIndex(path);
      if (index !== -1 && isDefined(this.parsedNodes[index])) {
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
    this.flushParsedNodes();
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

  getNodeValidationText(path?: string): string | undefined {
    const schema = this.getNodeSchema(path);
    const definition = this.getNodeDefinition(path);
    if (!schema || !definition) return undefined;
    return ModelValidationService.validateNodeStatus(schema, definition);
  }

  canDragNode(_path?: string): boolean {
    return false;
  }

  canDropOnNode(_path?: string): boolean {
    return false;
  }

  getCopiedContent(path?: string): IClipboardCopyObject | undefined {
    if (!path) return undefined;

    // Root path → copy the entire mode as a full entity.
    // Strip the slug so that addNewEntity generates a fresh one for the duplicate,
    // preventing both entities from sharing the same ID on the canvas.
    if (path === this.getRootPath()) {
      const { slug: _slug, ...rest } = this.toJSON();
      return {
        type: SourceSchemaType.CustomMode,
        name: EntityType.CustomMode,
        definition: rest,
      };
    }

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

    const isTool = options.definedComponent.type === CatalogKind.BobTool;
    const newNode: CustomInstructionsNode = isTool
      ? {
          nodeType: 'tool-invocation',
          title: options.definedComponent.name,
          rawContent: `**${options.definedComponent.name}**`,
          toolName: options.definedComponent.name,
          index: 0,
        }
      : {
          nodeType: 'step',
          title: options.definedComponent.name,
          rawContent: '',
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
    // Sync groups for the newly added node immediately — before toJSON() is called.
    CustomModeGroupsService.syncGroupsForNode(options.definedComponent.name, this.mode);
  }

  removeStep(path?: string): void {
    if (!path) return;
    const index = this.extractStepIndex(path);
    if (index === -1) return;

    this.parsedNodes.splice(index, 1);
    this.reindexNodes();
    this.parsedNodesDirty = true;
    // Flush immediately so this.mode.customInstructions reflects the removal.
    // The framework reconstructs entities from this.mode (by reference) via initialize()
    // without calling toJSON() first. Without this flush the stale customInstructions
    // still contains the removed node reference, and the constructor re-adds its groups.
    this.flushParsedNodes();
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
    //    Title is intentionally left empty so enrichNodeFromCatalog can populate it from the
    //    catalog; a post-enrichment fallback sets mode.name when the catalog has no entry.
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
      const catalogKey = isToolInvocation ? (node.toolName ?? node.nodeType) : 'text-node';
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

    // 3. Placeholder
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
  private flushParsedNodes(): void {
    if (!this.parsedNodesDirty) return;
    // Sort by node.index so that a user-edited `order` field takes effect before serializing,
    // then normalize indexes back to 1…n so they stay in sync with the array position.
    this.parsedNodes.sort((a, b) => a.index - b.index);
    this.reindexNodes();
    this.mode.customInstructions = CustomInstructionsParser.serialize(this.parsedNodes);
    this.parsedNodesDirty = false;
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
