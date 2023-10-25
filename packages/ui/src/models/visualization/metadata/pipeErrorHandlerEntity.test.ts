import { pipeJson } from '../../../stubs/pipe';
import { PipeSpecErrorHandler } from '../../camel/entities';
import { PipeErrorHandlerEntity } from './pipeErrorHandlerEntity';

describe('PipeErrorHandlerEntity', () => {
  it('should return JSON', () => {
    const entity = new PipeErrorHandlerEntity(pipeJson.spec as PipeSpecErrorHandler);
    expect(entity.toJSON()).toEqual({ errorHandler: pipeJson.spec?.errorHandler });
  });
});
