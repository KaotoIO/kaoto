import { BaseCamelEntity } from './entities';
import { BaseVisualCamelEntity } from '../visualization/base-visual-entity';
import { Kamelet as KameletType } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './source-schema-type';
import { CamelKResource } from './camel-k-resource';

export class KameletResource extends CamelKResource {
  constructor(private kamelet?: KameletType) {
    super(kamelet);
    if (!kamelet) {
      this.kamelet = this.resource as KameletType;
      this.kamelet.kind = SourceSchemaType.Kamelet;
      return;
    }
  }

  getEntities(): BaseCamelEntity[] {
    return super.getEntities(); // TODO
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
    return this.kamelet!;
  }
}
