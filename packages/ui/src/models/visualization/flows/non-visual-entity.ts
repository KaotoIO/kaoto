import { v4 as uuidv4 } from 'uuid';

import { BaseEntity, EntityType } from '../../entities/base-entity';

export class NonVisualEntity implements BaseEntity {
  readonly id = uuidv4();
  type: EntityType = EntityType.NonVisualEntity;

  constructor(private readonly base: unknown) {}

  toJSON(): unknown {
    return this.base;
  }
}
