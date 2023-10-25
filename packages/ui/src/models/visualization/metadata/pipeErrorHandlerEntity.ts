import { v4 as uuidv4 } from 'uuid';
import { BaseCamelEntity, EntityType } from '../../camel/entities';
import { PipeSpecErrorHandler } from '../../camel/entities/pipe-overrides';

export class PipeErrorHandlerEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  readonly type = EntityType.ErrorHandler;

  constructor(public parent: PipeSpecErrorHandler) {}

  toJSON() {
    return { errorHandler: this.parent.errorHandler };
  }

  updateModel(): void {
    return;
  }
}
