import {
  Integration as IntegrationType,
  KameletBinding as KameletBindingType,
  Pipe as PipeType,
} from '@kaoto/camel-catalog/types';
import { TileFilter } from '../../components/Catalog';
import { createCamelPropertiesSorter } from '../../utils';
import { IKameletDefinition } from '../kamelets-catalog';
import { AddStepMode, BaseVisualCamelEntity, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { MetadataEntity } from '../visualization/metadata';
import { BaseVisualCamelEntityDefinition, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { SourceSchemaType } from './source-schema-type';
import { CamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';

export type CamelKType = IntegrationType | IKameletDefinition | KameletBindingType | PipeType;

export enum CamelKResourceKinds {
  Integration = 'Integration',
  Kamelet = 'Kamelet',
  KameletBinding = 'KameletBinding',
  Pipe = 'Pipe',
}

export const CAMEL_K_K8S_API_VERSION_V1 = 'camel.apache.org/v1';

export abstract class CamelKResource implements CamelResource {
  static readonly PARAMETERS_ORDER = ['apiVersion', 'kind', 'metadata', 'spec', 'source', 'steps', 'sink'];
  // static serializer = new YamlResourceSerializer();
  readonly sortFn = createCamelPropertiesSorter(CamelKResource.PARAMETERS_ORDER) as (a: unknown, b: unknown) => number;
  protected resource: CamelKType;
  private metadata?: MetadataEntity;

  constructor(
    parsedResource: unknown,
    private readonly serializer: CamelResourceSerializer = new YamlCamelResourceSerializer(),
  ) {
    this.serializer = serializer;

    if (parsedResource) {
      this.resource = parsedResource as CamelKType;
    } else {
      this.resource = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        spec: {},
      };
    }
    this.metadata = this.resource.metadata && new MetadataEntity(this.resource);
  }

  getCanvasEntityList(): BaseVisualCamelEntityDefinition {
    return {
      common: [],
      groups: {},
    };
  }

  removeEntity(_id?: string) {}
  refreshVisualMetadata() {}
  createMetadataEntity() {
    this.resource.metadata = {};
    this.metadata = new MetadataEntity(this.resource);
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

  abstract toJSON(): unknown;

  addNewEntity(): string {
    /** Not supported by default */
    return '';
  }

  supportsMultipleVisualEntities(): boolean {
    /** Not supported by default */
    return false;
  }

  /** Components Catalog related methods */
  getCompatibleComponents(_mode: AddStepMode, _visualEntityData: IVisualizationNodeData): TileFilter | undefined {
    return undefined;
  }
  getSerializer() {
    return this.serializer;
  }

  setSerializer(_serializer: CamelResourceSerializer): void {
    /** Not supported by default */
  }

  toString(): string {
    return this.serializer.serialize(this);
  }
}
