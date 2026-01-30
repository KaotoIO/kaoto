import { citrusTestJson } from '../../stubs/citrus-test';
import { SerializerType, SourceSchemaType } from '../camel';
import { CitrusTestResource } from './citrus-test-resource';
import { CitrusTestResourceFactory } from './citrus-test-resource-factory';
import { Test } from './entities/Test';

describe('CitrusTestResourceFactory', () => {
  describe('createCitrusTestResource', () => {
    it('should create from test source', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource(citrusTestJson, SourceSchemaType.Test);
      expect(resource).toBeInstanceOf(CitrusTestResource);
      expect(resource?.getSerializerType()).toEqual(SerializerType.YAML);
    });

    it('should handle undefined source', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource();
      expect(resource).toBeUndefined();
    });

    it('should handle other schema types', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource({} as Test, SourceSchemaType.Route);
      expect(resource).toBeUndefined();
    });

    it('should handle undefined source object', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource(undefined, SourceSchemaType.Test);
      expect(resource).toBeInstanceOf(CitrusTestResource);
      expect(resource?.getSerializerType()).toEqual(SerializerType.YAML);
    });
  });
});
