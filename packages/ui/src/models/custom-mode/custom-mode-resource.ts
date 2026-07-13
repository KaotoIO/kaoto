import { isDefined } from '@kaoto/forms';
import { stringify } from 'yaml';

import { TileFilter } from '../../components/Catalog';
import { SourceSchemaType } from '../camel/source-schema-type';
import { BaseEntity, EntityType } from '../entities';
import { BaseVisualEntityDefinition, KaotoResource } from '../kaoto-resource';
import { AddStepMode, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { CustomMode, CustomModeFile } from './custom-mode-types';
import { CustomModeVisualEntity } from './custom-mode-visual-entity';

export class CustomModeResource implements KaotoResource {
  static readonly SUPPORTED_ENTITIES: { type: EntityType }[] = [{ type: EntityType.CustomMode }];

  private entities: CustomModeVisualEntity[] = [];

  get supportedEntities() {
    return CustomModeResource.SUPPORTED_ENTITIES;
  }

  constructor(private readonly rawFile?: CustomModeFile) {}

  async initialize(): Promise<void> {
    if (!isDefined(this.rawFile) || !Array.isArray(this.rawFile.customModes)) {
      this.entities = [];
      return;
    }
    this.entities = this.rawFile.customModes.map((mode) => new CustomModeVisualEntity(mode));
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.CustomMode;
  }

  getCompatibleRuntimes(): string[] {
    return ['Bob'];
  }

  supportsMultipleVisualEntities(): boolean {
    return true;
  }

  getVisualEntities(): CustomModeVisualEntity[] {
    return this.entities;
  }

  getEntities(): BaseEntity[] {
    return [];
  }

  addNewEntity(_entityType?: EntityType, entityTemplate?: unknown): string {
    const template = isDefined(entityTemplate)
      ? (entityTemplate as CustomMode)
      : (FlowTemplateService.getFlowTemplate(SourceSchemaType.CustomMode) as CustomMode);
    const entity = new CustomModeVisualEntity(template);
    this.entities.push(entity);
    return entity.id;
  }

  removeEntity(ids?: string[]): void {
    if (!isDefined(ids)) return;
    this.entities = this.entities.filter((e) => !ids.includes(e.id));
  }

  toJSON(): CustomModeFile {
    return { customModes: this.entities.map((e) => e.toJSON()) };
  }

  async toSourceCode(): Promise<string> {
    return stringify({ customModes: this.entities.map((e) => this.serializeMode(e.toJSON())) });
  }

  getCanvasEntityList(): BaseVisualEntityDefinition {
    return {
      common: [{ name: EntityType.CustomMode, title: 'Custom Mode', description: 'A Bob custom mode definition.' }],
      groups: {},
    };
  }

  getCompatibleComponents(_mode: AddStepMode, _data: IVisualizationNodeData): TileFilter | undefined {
    // Epic 5 will wire this to LlmToolsCatalog; return undefined for now (shows all tiles)
    return undefined;
  }

  /** Builds a mode object in canonical field order for stable YAML serialization. */
  private serializeMode(mode: CustomMode): Record<string, unknown> {
    const out: Record<string, unknown> = {
      slug: mode.slug,
      name: mode.name,
      description: mode.description,
      roleDefinition: mode.roleDefinition,
      whenToUse: mode.whenToUse,
    };
    if (isDefined(mode.customInstructions)) {
      out.customInstructions = mode.customInstructions;
    }
    out.groups = mode.groups;
    return out;
  }
}
