import { SourceSchemaType } from './source-schema-type';
import { KameletBindingResource } from './kamelet-binding-resource';
import { kameletBindingJson } from '../../stubs/kamelet-binding-route';

describe('KameletBindingResource', () => {
  it('should create KameletBindingResource', () => {
    const resource = new KameletBindingResource(kameletBindingJson);
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.spec!.source!.ref!.name).toEqual('webhook-source');
    expect(vis.spec!.steps![0].ref?.name).toEqual('delay-action');
    expect(vis.spec!.sink!.ref!.name).toEqual('log-sink');
    expect(resource.getEntities().length).toEqual(2);
  });

  it('should initialize KameletBinding if no args is specified', () => {
    const resource = new KameletBindingResource(undefined);
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.spec!.source).toBeUndefined();
    expect(vis.spec!.steps).toBeUndefined();
    expect(vis.spec!.sink).toBeUndefined();
  });
});
