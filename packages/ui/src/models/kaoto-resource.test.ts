import { XmlCamelResourceSerializer } from '../serializers/xml-camel-resource-serializer';
import { YamlCamelResourceSerializer } from '../serializers/yaml-camel-resource-serializer';
import { camelRouteYaml } from '../stubs/camel-route';
import { citrusTestYaml } from '../stubs/citrus-test';
import { integrationJson } from '../stubs/integration';
import { kameletBindingJson } from '../stubs/kamelet-binding-route';
import { kameletJson } from '../stubs/kamelet-route';
import { pipeJson } from '../stubs/pipe';
import { CamelResourceFactory } from './camel/camel-resource-factory';
import { SourceSchemaType } from './camel/source-schema-type';
import { KaotoResourceSerializer } from './kaoto-resource';
import { CamelRouteVisualEntity, CitrusTestVisualEntity, PipeVisualEntity } from './visualization/flows';

describe('CamelResourceFactory.createCamelResource', () => {
  it('should create an empty CamelRouteResource if no args is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.yaml path is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty CamelRouteResource if a camel.xml path is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, { path: 'my-route.camel.xml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty IntegrationResource if no args is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, { path: 'chat.integration.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  it('should create an empty KameletResource if no args is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, {
      path: 'chuck-norris-source.kamelet.yaml',
    });
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toMatchSnapshot();
  });

  it('should create an empty CameletBindingResource if no args is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, {
      path: 'webhook-binding.kamelet-binding.yaml',
    });
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
  });

  it('should create an empty PipeResource if no args is specified', async () => {
    const resource = await CamelResourceFactory.createCamelResource(undefined, { path: 'webhook.pipe.yaml' });
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source).toBeUndefined();
    expect(vis.pipe.spec?.steps).toBeUndefined();
    expect(vis.pipe.spec?.sink).toBeUndefined();
  });

  it('should create a camel route', async () => {
    const resource = await CamelResourceFactory.createCamelResource(camelRouteYaml);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as CamelRouteVisualEntity;
    expect(vis.entityDef.route.from?.uri).toBeDefined();
  });

  // TODO
  it.skip('should create an Integration', async () => {
    const resource = await CamelResourceFactory.createCamelResource(JSON.stringify(integrationJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Integration);
    expect(resource.getVisualEntities().length).toEqual(2);
  });

  it('should create a Kamelet', async () => {
    const resource = await CamelResourceFactory.createCamelResource(JSON.stringify(kameletJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Kamelet);
    expect(resource.getVisualEntities().length).toEqual(1);
  });

  it('should create a KameletBindingPipe', async () => {
    const resource = await CamelResourceFactory.createCamelResource(JSON.stringify(kameletBindingJson));
    expect(resource.getType()).toEqual(SourceSchemaType.KameletBinding);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toEqual('webhook-source');
  });

  it('should create a Pipe', async () => {
    const resource = await CamelResourceFactory.createCamelResource(JSON.stringify(pipeJson));
    expect(resource.getType()).toEqual(SourceSchemaType.Pipe);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as PipeVisualEntity;
    expect(vis.pipe.spec?.source?.ref?.name).toEqual('webhook-source');
  });

  it('should create a Citrus test resource', async () => {
    const resource = await CamelResourceFactory.createCamelResource(citrusTestYaml);
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0] as CitrusTestVisualEntity;
    expect(vis.test).toBeDefined();
  });
});

describe('KaotoResourceSerializer', () => {
  it('should have async parse method (XML)', async () => {
    const serializer: KaotoResourceSerializer = new XmlCamelResourceSerializer();
    const result = serializer.parse('<xml/>');
    expect(result).toBeInstanceOf(Promise);
    const entities = await result;
    expect(entities).toBeDefined();
  });

  it('should have async parse method (YAML)', async () => {
    const serializer: KaotoResourceSerializer = new YamlCamelResourceSerializer();
    const result = serializer.parse('route:\n  id: test');
    expect(result).toBeInstanceOf(Promise);
    const entities = await result;
    expect(entities).toBeDefined();
  });
});
