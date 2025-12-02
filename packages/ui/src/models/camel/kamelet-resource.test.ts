import { cloneDeep } from 'lodash';

import { mockRandomValues } from '../../stubs';
import { kameletJson } from '../../stubs/kamelet-route';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelKResourceFactory } from './camel-k-resource-factory';
import { KameletResource } from './kamelet-resource';
import { SourceSchemaType } from './source-schema-type';

describe('KameletResource', () => {
  beforeAll(() => {
    mockRandomValues();
  });

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

      const resource = CamelKResourceFactory.getCamelKResource(kameletJson)!;
      resource.getCompatibleComponents(AddStepMode.ReplaceStep, {
        catalogKind: CatalogKind.Processor,
        name: 'from',
        path: 'from',
        label: 'timer',
      });

      expect(filterSpy).toHaveBeenCalledWith(
        AddStepMode.ReplaceStep,
        { catalogKind: CatalogKind.Processor, name: 'from', path: 'from', label: 'timer' },
        undefined,
      );
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
});
