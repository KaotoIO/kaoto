import { kameletJson } from '../../stubs/kamelet-route';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { createCamelResource } from './camel-resource';
import { KameletResource } from './kamelet-resource';
import { SourceSchemaType } from './source-schema-type';
import { cloneDeep } from 'lodash';

describe('KameletResource', () => {
  it('should create a new KameletResource', () => {
    const kameletResource = new KameletResource();
    expect(kameletResource).toMatchSnapshot();
  });

  it('should create a new KameletResource with a kamelet', () => {
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
          from: {
            id: 'from',
            uri: 'kamelet:source',
            steps: [],
          },
          beans: [],
        },
      },
    });

    expect(kameletResource).toMatchSnapshot();
  });

  it('should remove the entity', () => {
    const kameletResource = new KameletResource();

    kameletResource.removeEntity();

    const kameletVisualEntities = kameletResource.getVisualEntities();

    expect(kameletVisualEntities).toHaveLength(1);
  });

  it('should get the type', () => {
    const kameletResource = new KameletResource();
    expect(kameletResource.getType()).toEqual(SourceSchemaType.Kamelet);
  });

  it('should get the visual entities (Camel Route Visual Entity)', () => {
    const kameletResource = new KameletResource();
    expect(kameletResource.getVisualEntities()).toMatchSnapshot();
  });

  it('should convert to JSON', () => {
    const kameletResource = new KameletResource();
    expect(kameletResource.toJSON()).toMatchSnapshot();
  });

  describe('getCompatibleComponents', () => {
    it('should delegate to the CamelComponentFilterService', () => {
      const filterSpy = jest.spyOn(CamelComponentFilterService, 'getKameletCompatibleComponents');

      const resource = createCamelResource(kameletJson);
      resource.getCompatibleComponents(AddStepMode.ReplaceStep, { path: 'from', label: 'timer' });

      expect(filterSpy).toHaveBeenCalledWith(AddStepMode.ReplaceStep, { path: 'from', label: 'timer' }, undefined);
    });
  });

  it('should support RouteTemplateBeansAwareResource methods', () => {
    const model = cloneDeep(kameletJson);
    expect(model.spec.template.beans).toBeUndefined();
    const kameletResource = new KameletResource(model);
    expect(kameletResource.getRouteTemplateBeansEntity()).toBeUndefined();
    kameletResource.createRouteTemplateBeansEntity();
    const beansEntity = kameletResource.getRouteTemplateBeansEntity();
    expect(beansEntity!.parent.beans).toEqual([]);
    expect(model.spec.template.beans).toEqual([]);
    kameletResource.deleteRouteTemplateBeansEntity();
    expect(model.spec.template.beans).toBeUndefined();
    expect(kameletResource.getRouteTemplateBeansEntity()).toBeUndefined();
  });

  describe('comments', () => {
    it('should set and get comments', () => {
      const resource = new KameletResource();
      resource.setComments(['a', 'b']);
      expect(resource.getComments()).toEqual(['a', 'b']);
    });
  });
});
