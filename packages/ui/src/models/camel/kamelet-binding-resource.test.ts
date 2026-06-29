import { kameletBindingJson } from '../../stubs/kamelet-binding-route';
import { KameletBindingResource } from './kamelet-binding-resource';
import { SourceSchemaType } from './source-schema-type';

describe('KameletBindingResource', () => {
  it('should create KameletBindingResource', async () => {
    const resource = new KameletBindingResource(kameletBindingJson);
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec!.source!.ref!.name).toBe('webhook-source');
    expect(vis.pipe.spec!.steps![0].ref?.name).toBe('delay-action');
    expect(vis.pipe.spec!.sink!.ref!.name).toBe('log-sink');
    expect(resource.getEntities()).toHaveLength(2);
  });

  describe('getCompatibleRuntimes', () => {
    it('should return the correct list of compatible runtimes', async () => {
      const resource = new KameletBindingResource();
      await resource.initialize();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });

    it('should return the same list regardless of resource content', async () => {
      const emptyResource = new KameletBindingResource();
      await emptyResource.initialize();
      const resourceWithBinding = new KameletBindingResource(kameletBindingJson);
      await resourceWithBinding.initialize();

      expect(emptyResource.getCompatibleRuntimes()).toEqual(resourceWithBinding.getCompatibleRuntimes());
    });

    it('should return an array with three runtime names', async () => {
      const resource = new KameletBindingResource();
      await resource.initialize();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });
  });

  it('should initialize KameletBinding if no args is specified', async () => {
    const resource = new KameletBindingResource(undefined);
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec!.source).toBeUndefined();
    expect(vis.pipe.spec!.steps).toBeUndefined();
    expect(vis.pipe.spec!.sink).toBeUndefined();
  });
});
