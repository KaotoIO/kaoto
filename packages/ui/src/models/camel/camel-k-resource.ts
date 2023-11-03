import {
  Integration as IntegrationType,
  KameletBinding as KameletBindingType,
  Kamelet as KameletType,
  Pipe as PipeType,
} from '@kaoto-next/camel-catalog/types';
import { TileFilter } from '../../components/Catalog';
import { AddStepMode, BaseVisualCamelEntity, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { MetadataEntity } from '../visualization/metadata';
import { CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { SourceSchemaType } from './source-schema-type';

export type CamelKType = IntegrationType | KameletType | KameletBindingType | PipeType;

export enum CamelKResourceKinds {
  Integration = 'Integration',
  Kamelet = 'Kamelet',
  KameletBinding = 'KameletBinding',
  Pipe = 'Pipe',
}

export const CAMEL_K_K8S_API_VERSION_V1 = 'camel.apache.org/v1';

export abstract class CamelKResource implements CamelResource {
  protected resource: CamelKType;
  private metadata?: MetadataEntity;

  constructor(resource?: CamelKType) {
    if (resource) {
      this.resource = resource;
    } else {
      this.resource = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        spec: {},
      };
    }
    this.metadata = this.resource.metadata && new MetadataEntity(this.resource!);
  }

  removeEntity(_id?: string) {}
  createMetadataEntity() {
    this.resource.metadata = {};
    this.metadata = new MetadataEntity(this.resource!);
    return this.metadata;
  }

  getMetadataEntity() {
    return this.metadata;
  }

  deleteMetadataEntity() {
    this.resource.metadata = undefined;
    this.metadata = undefined;
  }

  getEntities(): BaseCamelEntity[] {
    const answer = [];
    if (this.resource.metadata && this.metadata) {
      answer.push(this.metadata);
    }
    return answer;
  }

  abstract getType(): SourceSchemaType;

  abstract getVisualEntities(): BaseVisualCamelEntity[];

  abstract supportsMultipleVisualEntities(): boolean;

  abstract toJSON(): unknown;

  addNewEntity(): string {
    return '';
  }

  /** Components Catalog related methods */
  getCompatibleComponents(_mode: AddStepMode, _visualEntityData: IVisualizationNodeData): TileFilter | undefined {
    return undefined;
  }
}
