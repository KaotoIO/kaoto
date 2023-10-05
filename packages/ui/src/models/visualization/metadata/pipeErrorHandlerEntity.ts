import { BaseCamelEntity, EntityType } from '../../camel/entities';
import { v4 as uuidv4 } from 'uuid';
import { PipeErrorHandler } from '../../camel/entities/pipe-overrides';

export type PipeErrorHandlerParentType = {
  errorHandler?: PipeErrorHandler;
};

export class PipeErrorHandlerEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  readonly type = EntityType.ErrorHandler;

  constructor(public parent: PipeErrorHandlerParentType) {}

  toJSON() {
    return { errorHandler: this.parent.errorHandler };
  }

  updateModel(): void {
    return;
  }
}
