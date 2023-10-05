import { ObjectMeta as MetadataModel } from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseCamelEntity } from '../../camel/entities';

export class MetadataEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Metadata;

  constructor(public metadata: Partial<MetadataModel> = {}) {}

  toJSON() {
    return { metadata: this.metadata };
  }

  updateModel(): void {
    return;
  }
}
