import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

import { TileFilter } from '../../components/Catalog';
import { Test } from '../citrus/entities/Test';
import { AddStepMode, BaseVisualCamelEntity, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { BeansEntity } from '../visualization/metadata';
import { RouteTemplateBeansEntity } from '../visualization/metadata/routeTemplateBeansEntity';
import { BaseCamelEntity, EntityType } from './entities';
import { SourceSchemaType } from './source-schema-type';

export interface CamelResource {
  getVisualEntities(): BaseVisualCamelEntity[];
  getEntities(): BaseCamelEntity[];
  addNewEntity(entityType?: EntityType, entityTemplate?: unknown): string;
  removeEntity(ids?: string[]): void;
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  toString(): string;
  getType(): SourceSchemaType;
  getCanvasEntityList(): BaseVisualCamelEntityDefinition;
  getSerializerType(): SerializerType;
  setSerializer(serializer: SerializerType): void;

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: IVisualizationNodeData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter | undefined;
}

export enum SerializerType {
  XML = 'XML',
  YAML = 'YAML',
}

export type Metadata = { [key: string]: unknown };

export interface CamelResourceSerializer {
  parse: (code: string) => CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe | Test | undefined;
  serialize: (resource: CamelResource) => string;
  getComments: () => string[];
  setComments: (comments: string[]) => void;
  setMetadata: (metadata: Metadata) => void;
  getMetadata: () => Metadata;
  getType(): SerializerType;
}

export interface BaseVisualCamelEntityDefinition {
  common: BaseVisualCamelEntityDefinitionItem[];
  groups: Record<string, BaseVisualCamelEntityDefinitionItem[]>;
}

export interface BaseVisualCamelEntityDefinitionItem {
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
