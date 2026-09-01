import { cloneDeep } from 'lodash';

import { mockRandomValues } from '../../stubs';
import { kameletJson } from '../../stubs/kamelet-route';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelKResourceFactory } from './camel-k-resource-factory';
import { KameletResource } from './kamelet-resource';
import { SourceSchemaType } from './source-schema-type';

describe('KameletResource', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  it('should create a new KameletResource', async () => {
    const kameletResource = new KameletResource();
    await kameletResource.initialize();
    expect(kameletResource).toMatchSnapshot();
  });

  it('should create a new KameletResource with a kamelet', async () => {
    const kameletResource = new KameletResource({
      kind: SourceSchemaType.Kamelet,
      metadata: {
        name: 'kamelet',
        annotations: {
          'camel.apache.org/kamelet.support.level': '',
          'camel.apache.org/catalog.version': '',
          'camel.apache.org/kamelet.icon': '',
          'camel.apache.org/provider': '',
          'camel.apache.org/kamelet.group': '',
          'camel.apache.org/kamelet.namespace': '',
        },
        labels: {
          'camel.apache.org/kamelet.type': '',
        },
      },
      spec: {
        definition: {
          title: 'kamelet',
          type: 'source',
        },
        dependencies: [],
        template: {
          beans: [],
          route: {
            from: {
              id: 'from',
              uri: 'kamelet:source',
              steps: [],
            },
          },
        },
      },
    });
    await kameletResource.initialize();

    expect(kameletResource).toMatchSnapshot();
  });

  it('should return an empty array for supportedEntities', async () => {
    const kameletResource = new KameletResource();
    expect(kameletResource.supportedEntities).toEqual([]);
  });

  it('should remove the entity', async () => {
    const kameletResource = new KameletResource();
    await kameletResource.initialize();

    kameletResource.removeEntity();

    const kameletVisualEntities = kameletResource.getVisualEntities();

    expect(kameletVisualEntities).toHaveLength(1);
  });

  it('should get the type', async () => {
    const kameletResource = new KameletResource();
    await kameletResource.initialize();
    expect(kameletResource.getType()).toEqual(SourceSchemaType.Kamelet);
  });

  it('should get the visual entities (Camel Route Visual Entity)', async () => {
    const kameletResource = new KameletResource();
    await kameletResource.initialize();
    expect(kameletResource.getVisualEntities()).toMatchSnapshot();
  });

  it('should convert to JSON', async () => {
    const kameletResource = new KameletResource();
    await kameletResource.initialize();
    expect(kameletResource.toJSON()).toMatchSnapshot();
  });

  describe('getCompatibleComponents', () => {
    it('should delegate to the CamelComponentFilterService', () => {
      const filterSpy = vi.spyOn(CamelComponentFilterService, 'getKameletCompatibleComponents');

      const resource = CamelKResourceFactory.getCamelKResource(kameletJson)!;
      resource.getCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'from',
        path: 'from',
        label: 'timer',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(filterSpy).toHaveBeenCalledWith(
        AddStepMode.ReplaceStep,
        {
          name: 'from',
          path: 'from',
          label: 'timer',
          isPlaceholder: false,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
        },
        undefined,
      );
    });
  });

  describe('getCompatibleRuntimes', () => {
    it('should return the correct list of compatible runtimes', async () => {
      const kameletResource = new KameletResource();
      await kameletResource.initialize();
      const compatibleRuntimes = kameletResource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });

    it('should return the same list regardless of resource content', async () => {
      const emptyResource = new KameletResource();
      await emptyResource.initialize();
      const resourceWithKamelet = new KameletResource(kameletJson);
      await resourceWithKamelet.initialize();

      expect(emptyResource.getCompatibleRuntimes()).toEqual(resourceWithKamelet.getCompatibleRuntimes());
    });

    it('should return an array with three runtime names', async () => {
      const kameletResource = new KameletResource();
      await kameletResource.initialize();
      const compatibleRuntimes = kameletResource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Main', 'Quarkus', 'Spring Boot']);
    });
  });

  describe('addNewEntity', () => {
    it('should apply a pasted kamelet template including intermediate steps', async () => {
      const resource = new KameletResource();
      await resource.initialize();
      resource.removeEntity();

      const id = resource.addNewEntity(undefined, cloneDeep(kameletJson));

      expect(id).toBe('user-source');
      const from = resource.getVisualEntities()[0].toJSON().from;
      expect(from.uri).toBe('timer');
      expect(from.steps).toHaveLength(2);
    });

    it('should rebuild beans from the replacement template', async () => {
      const withBeans = cloneDeep(kameletJson);
      withBeans.spec.template.beans = [{ name: 'myBean' }];
      const resource = new KameletResource();
      await resource.initialize();
      resource.createRouteTemplateBeansEntity();

      resource.addNewEntity(undefined, withBeans);

      expect(resource.getRouteTemplateBeansEntity()?.parent.beans).toEqual([{ name: 'myBean' }]);
    });

    it('should clear beans when the replacement template has none', async () => {
      const resource = new KameletResource(cloneDeep(kameletJson));
      await resource.initialize();
      resource.createRouteTemplateBeansEntity();
      expect(resource.getRouteTemplateBeansEntity()).toBeDefined();

      resource.addNewEntity(undefined, cloneDeep(kameletJson));

      expect(resource.getRouteTemplateBeansEntity()).toBeUndefined();
    });
  });

  it('should support RouteTemplateBeansAwareResource methods', async () => {
    const model = cloneDeep(kameletJson);
    expect(model.spec.template.beans).toBeUndefined();
    const kameletResource = new KameletResource(model);
    await kameletResource.initialize();
    expect(kameletResource.getRouteTemplateBeansEntity()).toBeUndefined();
    kameletResource.createRouteTemplateBeansEntity();
    const beansEntity = kameletResource.getRouteTemplateBeansEntity();
    expect(beansEntity!.parent.beans).toEqual([]);
    expect(model.spec.template.beans).toEqual([]);
    kameletResource.deleteRouteTemplateBeansEntity();
    expect(model.spec.template.beans).toBeUndefined();
    expect(kameletResource.getRouteTemplateBeansEntity()).toBeUndefined();
  });
});
