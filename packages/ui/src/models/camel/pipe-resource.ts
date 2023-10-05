import { CAMEL_K_K8S_API_VERSION_V1, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { PipeVisualEntity } from '../visualization/flows';
import { Pipe as PipeType } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';
import { MetadataEntity } from '../visualization/metadata';
import { PipeErrorHandlerEntity } from '../visualization/metadata/pipeErrorHandlerEntity';

export class PipeResource implements CamelResource {
  protected pipe: PipeType;
  private flow?: PipeVisualEntity;
  private metadata?: MetadataEntity;
  private errorHandler?: PipeErrorHandlerEntity;

  constructor(json: unknown) {
    if (!json) {
      this.pipe = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        kind: SourceSchemaType.Pipe,
      };
      return;
    }
    this.pipe = json as PipeType;
    this.flow = new PipeVisualEntity(this.pipe.spec);
    this.metadata = new MetadataEntity(this.pipe.metadata);
    this.errorHandler = new PipeErrorHandlerEntity(this.pipe.spec?.errorHandler);
  }

  getEntities(): BaseCamelEntity[] {
    const answer = [];
    if (this.metadata?.metadata) {
      answer.push(this.metadata);
    }
    if (this.errorHandler?.errorHandler) {
      answer.push(this.errorHandler);
    }
    return answer;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Pipe;
  }

  getVisualEntities(): PipeVisualEntity[] {
    return this.flow ? [this.flow] : [];
  }

  supportsMultipleVisualEntities(): boolean {
    return false;
  }

  toJSON(): PipeType {
    return this.pipe;
  }

  addEntity(entity: BaseCamelEntity) {
    entity; // TODO
  }
}
