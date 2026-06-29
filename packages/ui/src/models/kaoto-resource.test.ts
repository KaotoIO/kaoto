import { camelRouteYaml } from '../stubs/camel-route';
import { citrusTestYaml } from '../stubs/citrus-test';
import { integrationJson } from '../stubs/integration';
import { kameletBindingJson } from '../stubs/kamelet-binding-route';
import { kameletJson } from '../stubs/kamelet-route';
import { mockRandomValues } from '../stubs/mock-random-values';
import { pipeJson } from '../stubs/pipe';
import { CamelResourceFactory } from './camel/camel-resource-factory';
import { SourceSchemaType } from './camel/source-schema-type';
import { CamelRouteVisualEntity, CitrusTestVisualEntity, PipeVisualEntity } from './visualization/flows';

describe('CamelResourceFactory.createCamelResource', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  it('should create an empty CamelRouteResource if no args is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource();
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.yaml path is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.yaml' });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.xml path is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.xml' });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty IntegrationResource if no args is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'chat.integration.yaml' });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty KameletResource if no args is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'chuck-norris-source.kamelet.yaml' });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    const entities = resource.getEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].toJSON()).toEqual({ metadata: { name: expect.stringMatching(/^kamelet-\d{4}$/) } });
    expect(resource.getVisualEntities()).toMatchSnapshot();
  });

  it('should create an empty CameletBindingResource if no args is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, {
      path: 'webhook-binding.kamelet-binding.yaml',
    });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toHaveLength(1);
  });

  it('should create an empty PipeResource if no args is specified', async () => {
    const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'webhook.pipe.yaml' });
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source).toBeUndefined();
    expect(vis.pipe.spec?.steps).toBeUndefined();
    expect(vis.pipe.spec?.sink).toBeUndefined();
  });

  it('should create a camel route', async () => {
    const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0] as CamelRouteVisualEntity;
    expect(vis.entityDef.route.from?.uri).toBeDefined();
  });

  // TODO
  it.skip('should create an Integration', async () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(integrationJson));
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getVisualEntities()).toHaveLength(2);
  });

  it('should create a Kamelet', async () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(kameletJson));
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    expect(resource.getVisualEntities()).toHaveLength(1);
  });

  it('should create a KameletBindingPipe', async () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(kameletBindingJson));
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toBe('webhook-source');
  });

  it('should create a Pipe', async () => {
    const resource = CamelResourceFactory.createCamelResource(JSON.stringify(pipeJson));
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toBe('webhook-source');
  });

  it('should create a Citrus test resource', async () => {
    const resource = CamelResourceFactory.createCamelResource(citrusTestYaml);
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0] as CitrusTestVisualEntity;
    expect(vis.test).toBeDefined();
  });
});
