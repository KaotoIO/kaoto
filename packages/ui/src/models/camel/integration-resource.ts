import { CAMEL_K_K8S_API_VERSION_V1, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { BaseVisualCamelEntity } from '../visualization/base-visual-entity';
import { Integration as IntegrationType } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';

export class IntegrationResource implements CamelResource {
  private integration: IntegrationType;

  constructor(json?: unknown) {
    if (!json) {
      this.integration = {
        apiVersion: CAMEL_K_K8S_API_VERSION_V1,
        kind: SourceSchemaType.Integration,
      };
      return;
    }
    this.integration = json as IntegrationType;
  }

  getEntities(): BaseCamelEntity[] {
    return []; // TODO
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Integration;
  }

  getVisualEntities(): BaseVisualCamelEntity[] {
    return []; // TODO
  }

  supportsMultipleVisualEntities(): boolean {
    return true;
  }

  toJSON(): IntegrationType {
    return this.integration;
  }

  addEntity(entity: BaseCamelEntity): void {
    entity; // TODO
  }
}
