import { PipeErrorHandlerEntity } from './pipeErrorHandlerEntity';
import { pipeJson } from '../../../stubs/pipe';
describe('PipeErrorHandlerEntity', () => {
  it('should return JSON', () => {
    const entity = new PipeErrorHandlerEntity(pipeJson.spec);
    expect(entity.toJSON()).toEqual({ errorHandler: pipeJson.spec.errorHandler });
  });
});
