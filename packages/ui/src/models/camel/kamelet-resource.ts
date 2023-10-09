import { CAMEL_K_K8S_API_VERSION_V1, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { BaseVisualCamelEntity } from '../visualization/base-visual-entity';
import { Kamelet as KameletType } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';

export class KameletResource implements CamelResource {
  private kamelet: KameletType;

  constructor(json?: unknown) {
    if (!json) {
      this.kamelet = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        kind: SourceSchemaType.Kamelet,
      };
      return;
    }
    this.kamelet = json as KameletType;
  }

  getEntities(): BaseCamelEntity[] {
    return []; // TODO
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Kamelet;
  }

  getVisualEntities(): BaseVisualCamelEntity[] {
    return []; // TODO
  }

  supportsMultipleVisualEntities(): boolean {
    return false;
  }

  toJSON(): KameletType {
    return this.kamelet;
  }

  addEntity(entity: BaseCamelEntity): void {
    entity; // TODO
  }
}
