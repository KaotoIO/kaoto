import { v4 as uuidv4 } from 'uuid';
import { BaseCamelEntity, EntityType } from '../../camel/entities/base-entity';

export class NonVisualEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  type: EntityType = EntityType.NonVisualEntity;

  constructor(private readonly base: unknown) {}

  toJSON(): unknown {
    return this.base;
  }
}
