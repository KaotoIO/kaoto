import { MetadataEntity } from './metadataEntity';
import { pipeJson } from '../../../stubs/pipe';

describe('MetadataEntity', () => {
  it('should return JSON', () => {
    const entity = new MetadataEntity(pipeJson);
    expect(entity.toJSON()).toEqual({ metadata: pipeJson.metadata });
  });
});
