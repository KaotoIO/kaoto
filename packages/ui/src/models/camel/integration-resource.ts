import { BaseCamelEntity } from './entities';
import { BaseVisualCamelEntity } from '../visualization/base-visual-entity';
import { Integration as IntegrationType } from '@kaoto/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';
import { CamelKResource } from './camel-k-resource';

export class IntegrationResource extends CamelKResource {
  private integration;

  constructor(integration?: IntegrationType) {
    super(integration);
    if (integration) {
      this.integration = integration;
    } else {
      this.integration = this.resource as IntegrationType;
      this.integration.kind = SourceSchemaType.Integration;
      return;
    }
  }

  getEntities(): BaseCamelEntity[] {
    return super.getEntities(); // TODO
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

  addNewEntity(): string {
    //TODO
    return '';
  }
}
