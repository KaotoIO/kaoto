import { citrusTestJson } from '../../stubs/citrus-test';
import { SourceSchemaType } from '../camel';
import { CitrusTestResource } from './citrus-test-resource';

describe('CitrusTestResource', () => {
  it('should initialize Citrus test if no args is specified', () => {
    const resource = new CitrusTestResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(0);
  });

  it('should initialize Citrus test', () => {
    const resource = new CitrusTestResource(citrusTestJson);
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.test).toBeDefined();
    expect(vis.test.actions).toBeDefined();
    expect(vis.test.name).toBeDefined();
  });
});
