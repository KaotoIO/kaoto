import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

import { TileFilter } from '../components/Catalog';
import { SourceSchemaType } from './camel/source-schema-type';
import { Test } from './citrus/entities/Test';
import { BaseEntity, EntityType } from './entities';
import { AddStepMode, BaseVisualEntity, IVisualizationNodeData } from './visualization/base-visual-entity';
import { BeansEntity } from './visualization/metadata';
import { RouteTemplateBeansEntity } from './visualization/metadata/routeTemplateBeansEntity';

export interface KaotoResource {
  getVisualEntities(): BaseVisualEntity[];
  getEntities(): BaseEntity[];
  addNewEntity(entityType?: EntityType, entityTemplate?: unknown, insertAfterEntityId?: string): string;
  removeEntity(ids?: string[]): void;
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  toString(): string;
  getType(): SourceSchemaType;
  getCanvasEntityList(): BaseVisualEntityDefinition;
  getSerializerType(): SerializerType;
  setSerializer(serializer: SerializerType): void;

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

export enum SerializerType {
  XML = 'XML',
  YAML = 'YAML',
}

export type Metadata = { [key: string]: unknown };

export interface KaotoResourceSerializer {
  parse: (code: string) => CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe | Test | undefined;
  serialize: (resource: KaotoResource) => string;
  getComments: () => string[];
  setComments: (comments: string[]) => void;
  setMetadata: (metadata: Metadata) => void;
  getMetadata: () => Metadata;
  getType(): SerializerType;
}

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
