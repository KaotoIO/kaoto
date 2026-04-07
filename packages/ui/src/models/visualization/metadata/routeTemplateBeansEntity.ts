import { BeanFactory } from '@kaoto/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';

import { BaseEntity, EntityType } from '../../entities';

export type RouteTemplateBeansParentType = {
  beans: Partial<BeanFactory>[];
};

export class RouteTemplateBeansEntity implements BaseEntity {
  readonly id = uuidv4();
  type = EntityType.Beans;

  constructor(public parent: RouteTemplateBeansParentType) {}

  toJSON() {
    return { beans: this.parent.beans };
  }

  updateModel(): void {
    return;
  }
}
