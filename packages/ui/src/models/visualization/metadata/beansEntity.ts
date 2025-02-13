import { BeansDeserializer } from '@kaoto/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseCamelEntity } from '../../camel/entities';
import { isDefined } from '../../../utils';

/** Very basic check to determine whether this object is a Beans */
export const isBeans = (rawEntity: unknown): rawEntity is { beans: BeansDeserializer } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'beans' in rawEntity! && Array.isArray((rawEntity! as any).beans);
};

export type BeansParentType = {
  beans: BeansDeserializer;
};

export class BeansEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  readonly type = EntityType.Beans;

  constructor(public parent: BeansParentType) {}

  toJSON() {
    return { beans: this.parent.beans };
  }

  updateModel(): void {
    return;
  }
}
