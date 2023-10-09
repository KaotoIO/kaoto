import { CAMEL_K_K8S_API_VERSION_V1, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { PipeVisualEntity } from '../visualization/flows';
import { Pipe as PipeType } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';

export class PipeResource implements CamelResource {
  protected pipe: PipeType;

  constructor(json: unknown) {
    if (!json) {
      this.pipe = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        kind: SourceSchemaType.Pipe,
      };
      return;
    }
    this.pipe = json as PipeType;
  }

  getEntities(): BaseCamelEntity[] {
    return []; // TODO [new MetadataEntity(this.pipe.metadata), new ErrorHandlerEntity(this.pipe.spec?.errorHandler)];
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Pipe;
  }

  getVisualEntities(): PipeVisualEntity[] {
    return [new PipeVisualEntity(this.pipe.spec?.source, this.pipe.spec?.steps, this.pipe.spec?.sink)];
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
