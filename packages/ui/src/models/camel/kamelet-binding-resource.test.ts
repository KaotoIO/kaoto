import { kameletBindingJson } from '../../stubs/kamelet-binding-route';
import { KameletBindingResource } from './kamelet-binding-resource';
import { SourceSchemaType } from './source-schema-type';

describe('KameletBindingResource', () => {
  it('should create KameletBindingResource', () => {
    const resource = new KameletBindingResource(kameletBindingJson);
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec!.source!.ref!.name).toEqual('webhook-source');
    expect(vis.pipe.spec!.steps![0].ref?.name).toEqual('delay-action');
    expect(vis.pipe.spec!.sink!.ref!.name).toEqual('log-sink');
    expect(resource.getEntities().length).toEqual(2);
  });

  describe('getCompatibleRuntimes', () => {
    it('should return the correct list of compatible runtimes', () => {
      const resource = new KameletBindingResource();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });

    it('should return the same list regardless of resource content', () => {
      const emptyResource = new KameletBindingResource();
      const resourceWithBinding = new KameletBindingResource(kameletBindingJson);

      expect(emptyResource.getCompatibleRuntimes()).toEqual(resourceWithBinding.getCompatibleRuntimes());
    });

    it('should return an array with three runtime names', () => {
      const resource = new KameletBindingResource();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });
  });

  it('should initialize KameletBinding if no args is specified', () => {
    const resource = new KameletBindingResource(undefined);
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec!.source).toBeUndefined();
    expect(vis.pipe.spec!.steps).toBeUndefined();
    expect(vis.pipe.spec!.sink).toBeUndefined();
  });
});
