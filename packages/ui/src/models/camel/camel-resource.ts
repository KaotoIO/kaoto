import {
  Integration as IntegrationType,
  KameletBinding as KameletBindingType,
  Kamelet as KameletType,
  Pipe as PipeType,
} from '@kaoto-next/camel-catalog/types';
import { CatalogFilter } from '../catalog-filter';
import { AddStepMode, BaseVisualCamelEntity, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { BeansEntity } from '../visualization/metadata';
import { CamelRouteResource } from './camel-route-resource';
import { BaseCamelEntity } from './entities';
import { IntegrationResource } from './integration-resource';
import { KameletBindingResource } from './kamelet-binding-resource';
import { KameletResource } from './kamelet-resource';
import { PipeResource } from './pipe-resource';
import { SourceSchemaType } from './source-schema-type';

export interface CamelResource {
  getVisualEntities(): BaseVisualCamelEntity[];
  getEntities(): BaseCamelEntity[];
  addNewEntity(entity?: unknown): string;
  removeEntity(id?: string): void;
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  getType(): SourceSchemaType;

  /** Components Catalog related methods */
  getCompatibleComponents(mode: AddStepMode, visualEntityData: IVisualizationNodeData): CatalogFilter;
}

export interface BeansAwareResource {
  createBeansEntity(): BeansEntity;
  deleteBeansEntity(entity: BeansEntity): void;
}

/**
 * Creates a CamelResource based on the given {@link type} and {@link json}. If
 * both are not specified, a default empty {@link CamelRouteResource} is created.
 * If only {@link type} is specified, an empty {@link CamelResource} of the given
 * {@link type} is created.
 * @param type
 * @param json
 */
export function createCamelResource(json?: unknown, type?: SourceSchemaType): CamelResource {
  const jsonRecord = json as Record<string, unknown>;
  if (json && typeof json === 'object' && 'kind' in jsonRecord) {
    return doCreateCamelResource(json, jsonRecord['kind'] as SourceSchemaType);
  } else {
    return doCreateCamelResource(json, type || SourceSchemaType.Route);
  }
}

function doCreateCamelResource(json?: unknown, type?: SourceSchemaType): CamelResource {
  switch (type) {
    case SourceSchemaType.Integration:
      return new IntegrationResource(json as IntegrationType);
    case SourceSchemaType.Kamelet:
      return new KameletResource(json as KameletType);
    case SourceSchemaType.KameletBinding:
      return new KameletBindingResource(json as KameletBindingType);
    case SourceSchemaType.Pipe:
      return new PipeResource(json as PipeType);
    default:
      return new CamelRouteResource(json);
  }
}
