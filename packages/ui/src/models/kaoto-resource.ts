import { TileFilter } from '../components/Catalog';
import { SourceSchemaType } from './camel/source-schema-type';
import { BaseEntity, EntityType } from './entities';
import { AddStepMode, BaseVisualEntity, IVisualizationNodeData } from './visualization/base-visual-entity';
import { BeansEntity } from './visualization/metadata';
import { RouteTemplateBeansEntity } from './visualization/metadata/routeTemplateBeansEntity';

/**
 * The KaotoResource should be created lazily, as some require a fully loaded catalog to properly
 * parse them (f.i. XML Camel Routes)
 */
export interface KaotoResource {
  /**
   * After creation, the `initialize` method parses the underlying DSL to populate the resource entities
   */
  initialize(): void;
  /** Entities this resource supports. Polymorphic — subclasses may return a restricted subset. */
  readonly supportedEntities: ReadonlyArray<{ type: EntityType }>;
  getVisualEntities(): BaseVisualEntity[];
  getEntities(): BaseEntity[];
  addNewEntity(entityType?: EntityType, entityTemplate?: unknown, insertAfterEntityId?: string): string;
  removeEntity(ids?: string[]): void;
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  toString(): string;
  getType(): SourceSchemaType;
  getCanvasEntityList(): BaseVisualEntityDefinition;

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: IVisualizationNodeData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter | undefined;

  /**
   * Returns the list of compatible runtime catalog names for this resource type.
   * For example, CamelRouteResource returns ["Main", "Quarkus", "Spring Boot"],
   * while CitrusTestResource returns ["Citrus"].
   */
  getCompatibleRuntimes(): string[];
}

export type Metadata = { [key: string]: unknown };

export interface BaseVisualEntityDefinition {
  common: BaseVisualEntityDefinitionItem[];
  groups: Record<string, BaseVisualEntityDefinitionItem[]>;
}

export interface BaseVisualEntityDefinitionItem {
  name: EntityType;
  title: string;
  description: string;
}

export interface BeansAwareResource {
  createBeansEntity(): BeansEntity;
  deleteBeansEntity(entity: BeansEntity): void;
}

export interface RouteTemplateBeansAwareResource {
  createRouteTemplateBeansEntity(): RouteTemplateBeansEntity;
  getRouteTemplateBeansEntity(): RouteTemplateBeansEntity | undefined;
  deleteRouteTemplateBeansEntity(): void;
}
