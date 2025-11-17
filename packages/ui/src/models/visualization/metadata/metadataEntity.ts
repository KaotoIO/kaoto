import { v4 as uuidv4 } from 'uuid';

import { BaseCamelEntity, EntityType } from '../../camel/entities';
import { IKameletMetadata } from '../../kamelets-catalog';

type MetadataParentType = {
  metadata?: Partial<IKameletMetadata>;
};

export class MetadataEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Metadata;

  constructor(public parent: MetadataParentType) {}

  toJSON() {
    return { metadata: this.parent.metadata };
  }

  updateModel(): void {
    return;
  }
}
