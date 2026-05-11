import { pipeJson } from '../../stubs/pipe';
import { PipeResource } from './pipe-resource';
import { SourceSchemaType } from './source-schema-type';

describe('PipeResource', () => {
  it('should create KameletBindingResource', () => {
    const resource = new PipeResource(pipeJson);
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec!.source!.ref!.name).toEqual('webhook-source');
    expect(vis.pipe.spec!.steps![0].ref?.name).toEqual('delay-action');
    expect(vis.pipe.spec!.sink!.ref!.name).toEqual('log-sink');
    expect(resource.getEntities().length).toEqual(2);
    const metadataEntity = resource.getMetadataEntity();
    expect(metadataEntity?.parent.metadata!.name).toEqual('webhook-binding');
    const errorHandlerEntity = resource.getErrorHandlerEntity();
    expect(errorHandlerEntity?.parent.errorHandler!.log).toBeDefined();
  });

  it('should initialize Pipe if no args is specified', () => {
    const resource = new PipeResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.pipe.spec?.source).toBeUndefined();
    expect(vis.pipe.spec?.steps).toBeUndefined();
    expect(vis.pipe.spec?.sink).toBeUndefined();
  });

  it('should create/delete entities', () => {
    const resource = new PipeResource();
    expect(resource.getEntities().length).toEqual(0);
    expect(resource.getMetadataEntity()).toBeUndefined();
    expect(resource.getErrorHandlerEntity()).toBeUndefined();
    expect(resource.toJSON().metadata).toBeDefined();
    expect(resource.toJSON().spec!.errorHandler).toBeUndefined();
    const metadataEntity = resource.createMetadataEntity();
    expect(resource.getMetadataEntity()).toEqual(metadataEntity);
    expect(resource.getEntities().length).toEqual(1);
    expect(resource.toJSON().metadata).toBeDefined();
    const errorHandlerEntity = resource.createErrorHandlerEntity();
    expect(resource.getErrorHandlerEntity()).toEqual(errorHandlerEntity);
    expect(resource.getEntities().length).toEqual(2);
    expect(resource.toJSON().spec!.errorHandler).toBeDefined();
    resource.deleteErrorHandlerEntity();
    expect(resource.getErrorHandlerEntity()).toBeUndefined();
    expect(resource.getEntities().length).toEqual(1);
    expect(resource.toJSON().spec!.errorHandler).toBeUndefined();
    resource.deleteMetadataEntity();
    expect(resource.getMetadataEntity()).toBeUndefined();
    expect(resource.getEntities().length).toEqual(0);
    expect(resource.toJSON().metadata).toBeUndefined();
  });
});
