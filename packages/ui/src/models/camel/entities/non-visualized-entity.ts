import { BaseCamelEntity, EntityType } from '.';
import { v4 as uuidv4 } from 'uuid';

export class NonVisualizedEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  type: EntityType = EntityType.NonVizualized;
  json: string;

  constructor(json: string) {
    this.json = json;
  }

  toJSON(): unknown {
    return this.json;
  }
}
