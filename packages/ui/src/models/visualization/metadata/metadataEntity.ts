import { ObjectMeta as MetadataModel } from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseCamelEntity } from '../../camel/entities';

type MetadataParentType = {
  metadata?: Partial<MetadataModel>;
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
