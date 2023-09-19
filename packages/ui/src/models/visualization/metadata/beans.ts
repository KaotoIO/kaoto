import { BeansDeserializer as BeansModel } from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseCamelEntity } from '../../camel-entities';

export class Beans implements BaseCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Beans;

  constructor(public beans: Partial<BeansModel> = []) {
  }

  toJSON() {
    return { beans: this.beans };
  }

  updateModel(): void {
    return;
  }
}
