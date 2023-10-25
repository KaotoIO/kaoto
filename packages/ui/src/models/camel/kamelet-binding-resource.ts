import { SourceSchemaType } from './source-schema-type';
import { PipeVisualEntity } from '../visualization/flows';
import { PipeResource } from './pipe-resource';
import { KameletBinding as KameletBindingType } from '@kaoto-next/camel-catalog/types';

/**
 * @deprecated KameletBinding was renamed to Pipe in Camel K 2.0. While KameletBinding is still supported,
 * it is recommended to use Pipe instead.
 */
export class KameletBindingResource extends PipeResource {
  constructor(json?: KameletBindingType) {
    super(json);
    if (!json) {
      this.pipe.kind = SourceSchemaType.KameletBinding;
    }
  }

  getVisualEntities(): PipeVisualEntity[] {
    return super.getVisualEntities() as PipeVisualEntity[];
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.KameletBinding;
  }

  addNewEntity(): string {
    //TODO
    return '';
  }
}
