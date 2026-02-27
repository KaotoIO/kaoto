import { camelRouteYaml } from '../../stubs/camel-route';
import { citrusTestYaml } from '../../stubs/citrus-test';
import { integrationJson } from '../../stubs/integration';
import { kameletBindingJson } from '../../stubs/kamelet-binding-route';
import { kameletJson } from '../../stubs/kamelet-route';
import { pipeJson } from '../../stubs/pipe';
import { CamelRouteVisualEntity, CitrusTestVisualEntity, PipeVisualEntity } from '../visualization/flows';
import { CamelResourceFactory } from './camel-resource-factory';
import { SourceSchemaType } from './source-schema-type';

describe('CamelResourceFactory.createCamelResource', () => {
  it('should create an empty CamelRouteResource if no args is specified', () => {
    const resource = CamelResourceFactory.createCamelResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.yaml path is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.xml path is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.xml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty IntegrationResource if no args is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'chat.integration.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty KameletResource if no args is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'chuck-norris-source.kamelet.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toMatchSnapshot();
  });

  it('should create an empty CameletBindingResource if no args is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, {
      path: 'webhook-binding.kamelet-binding.yaml',
    });
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
  });

  it('should create an empty PipeResource if no args is specified', () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'webhook.pipe.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source).toBeUndefined();
    expect(vis.pipe.spec?.steps).toBeUndefined();
    expect(vis.pipe.spec?.sink).toBeUndefined();
  });

  it('should create a camel route', () => {
    const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as CamelRouteVisualEntity;
    expect(vis.entityDef.route.from?.uri).toBeDefined();
  });

  // TODO
  it.skip('should create an Integration', () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(integrationJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getVisualEntities().length).toEqual(2);
  });

  it('should create a Kamelet', () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(kameletJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    expect(resource.getVisualEntities().length).toEqual(1);
  });

  it('should create a KameletBindingPipe', () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(kameletBindingJson));
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toEqual('webhook-source');
  });

  it('should create a Pipe', () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(pipeJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toEqual('webhook-source');
  });

  it('should create a Citrus test resource', () => {
    const resource = CamelResourceFactory.createCamelResource(citrusTestYaml);
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as CitrusTestVisualEntity;
    expect(vis.test).toBeDefined();
  });
});
