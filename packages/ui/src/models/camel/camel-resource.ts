import { TileFilter } from '../../components/Catalog';
import { AddStepMode, BaseVisualCamelEntity, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { BeansEntity } from '../visualization/metadata';
import { RouteTemplateBeansEntity } from '../visualization/metadata/routeTemplateBeansEntity';
import { BaseCamelEntity, EntityType } from './entities';
import { SourceSchemaType } from './source-schema-type';
import { CamelResourceSerializer } from '../../serializers';

export interface CamelResource {
  getVisualEntities(): BaseVisualCamelEntity[];
  getEntities(): BaseCamelEntity[];
  addNewEntity(entityType?: EntityType): string;
  removeEntity(id?: string): void;
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  toString(): string;
  getType(): SourceSchemaType;
  getCanvasEntityList(): BaseVisualCamelEntityDefinition;
  getSerializer(): CamelResourceSerializer;
  setSerializer(serializer: CamelResourceSerializer): void;

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: IVisualizationNodeData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter | undefined;

  sortFn?: (a: unknown, b: unknown) => number;
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
