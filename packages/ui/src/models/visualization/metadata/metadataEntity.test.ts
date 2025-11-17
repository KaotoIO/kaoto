import { pipeJson } from '../../../stubs/pipe';
import { MetadataEntity } from './metadataEntity';

describe('MetadataEntity', () => {
  it('should return JSON', () => {
    const entity = new MetadataEntity(pipeJson);
    expect(entity.toJSON()).toEqual({ metadata: pipeJson.metadata });
  });
});
