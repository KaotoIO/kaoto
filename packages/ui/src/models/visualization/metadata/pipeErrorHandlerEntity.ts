import { v4 as uuidv4 } from 'uuid';

import { BaseEntity, EntityType } from '../../entities';
import { PipeSpecErrorHandler } from '../../entities/pipe-overrides';

export class PipeErrorHandlerEntity implements BaseEntity {
  readonly id = uuidv4();
  readonly type = EntityType.PipeErrorHandler;

  constructor(public parent: PipeSpecErrorHandler) {}

  toJSON() {
    return { errorHandler: this.parent.errorHandler };
  }

  updateModel(): void {
    return;
  }
}
