import { BaseCamelEntity, EntityType } from '../../camel/entities';
import { v4 as uuidv4 } from 'uuid';
import { PipeErrorHandler as PipeErrorHandlerModel } from '@kaoto-next/camel-catalog/types';

export class PipeErrorHandlerEntity implements BaseCamelEntity {
  readonly id = uuidv4();
  type = EntityType.ErrorHandler;

  constructor(public errorHandler: Partial<PipeErrorHandlerModel> = {}) {}

  toJSON() {
    return { errorHandler: this.errorHandler };
  }

  updateModel(): void {
    return;
  }
}
