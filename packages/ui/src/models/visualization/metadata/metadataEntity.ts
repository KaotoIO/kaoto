import { v4 as uuidv4 } from 'uuid';

import { IKameletMetadata } from '../../camel/kamelets-catalog';
import { BaseEntity, EntityType } from '../../entities';

type MetadataParentType = {
  metadata?: Partial<IKameletMetadata>;
};

export class MetadataEntity implements BaseEntity {
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
