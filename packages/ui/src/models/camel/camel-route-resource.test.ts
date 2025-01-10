import { beansJson } from '../../stubs/beans';
import { camelFromJson } from '../../stubs/camel-from';
import { camelRouteJson, camelRouteYaml } from '../../stubs/camel-route';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../visualization/flows/camel-route-visual-entity';
import { NonVisualEntity } from '../visualization/flows/non-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { BeansEntity } from '../visualization/metadata/beansEntity';
import { CamelRouteResource } from './camel-route-resource';
import { EntityType } from './entities';
import { SourceSchemaType } from './source-schema-type';
import { CamelResourceFactory } from './camel-resource-factory';
import { CamelYamlDsl } from '@kaoto/camel-catalog/types';

describe('CamelRouteResource', () => {
  it('should create CamelRouteResource', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getVisualEntities().length).toEqual(1);
    expect(resource.getEntities().length).toEqual(0);
  });

  it('should initialize Camel Route if no args is specified', () => {
    const resource = new CamelRouteResource(undefined);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });

  describe("function Object() { [native code] }", () => {
    const testCases: [CamelYamlDsl, unknown][] = [
      // Good cases
      [[camelRouteJson], CamelRouteVisualEntity],
      [[camelFromJson], CamelRouteVisualEntity],
      [[{ from: { uri: 'direct:foo', steps: [] } }], CamelRouteVisualEntity],
      [[{ from: { uri: 'direct:foo' } }] as CamelYamlDsl, CamelRouteVisualEntity],
      [[{ beans: [] }], BeansEntity],
      [[], undefined],

      // Temporary good cases
      [camelRouteJson as unknown as CamelYamlDsl, CamelRouteVisualEntity],
      [camelFromJson as unknown as CamelYamlDsl, CamelRouteVisualEntity],
      [{ from: { uri: 'direct:foo', steps: [] } } as unknown as CamelYamlDsl, CamelRouteVisualEntity],
      [{ from: { uri: 'direct:foo' } } as unknown as CamelYamlDsl, CamelRouteVisualEntity],
      [{ beans: [] } as unknown as CamelYamlDsl, BeansEntity],

      // Bad cases
      [{ from: 'direct:foo' } as unknown as CamelYamlDsl, NonVisualEntity],
      [{} as CamelYamlDsl, NonVisualEntity],
      [undefined as unknown as CamelYamlDsl, undefined],
      [null as unknown as CamelYamlDsl, undefined],
    ];
    it.each(testCases)('should return the appropriate entity for: %s', (json, expected) => {
      const resource = new CamelRouteResource(json);
      const firstEntity = resource.getVisualEntities()[0] ?? resource.getEntities()[0];

      if (typeof expected === 'function') {
        expect(firstEntity).toBeInstanceOf(expected);
      } else {
        expect(firstEntity).toEqual(expected);
      }
    });
  });

  describe('addNewEntity', () => {
    it('should add new entity and return its ID', () => {
      const resource = new CamelRouteResource();
      const id = resource.addNewEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add new entities at the end of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.Route);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[1].id).toEqual(id);
    });

    it('should add OnException entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.OnException);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add ErrorHandler entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.ErrorHandler);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });
  });

  it('should return the right type', () => {
    const resource = new CamelRouteResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
  });

  it('should allow consumers to have multiple visual entities', () => {
    const resource = new CamelRouteResource();
    expect(resource.supportsMultipleVisualEntities()).toEqual(true);
  });

  it('should return visual entities', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    expect(resource.getVisualEntities()).toHaveLength(1);
    expect(resource.getVisualEntities()[0]).toBeInstanceOf(CamelRouteVisualEntity);
    expect(resource.getEntities()).toHaveLength(0);
  });

  it('should return entities', () => {
    const resource = new CamelRouteResource([beansJson]);
    expect(resource.getEntities()).toHaveLength(1);
    expect(resource.getEntities()[0]).toBeInstanceOf(BeansEntity);
    expect(resource.getVisualEntities()).toHaveLength(0);
  });

  describe('toJSON', () => {
    it('should return JSON', () => {
      const resource = new CamelRouteResource([camelRouteJson]);
      expect(resource.toJSON()).toMatchSnapshot();
    });

    it.todo('should position the ID at the top of the JSON');
    it.todo('should position the parameters after the ID');
  });

  it('should create beans entity', () => {
    const resource = new CamelRouteResource();
    const beansEntity = resource.createBeansEntity();

    expect(resource.getEntities()).toHaveLength(1);
    expect(resource.getEntities()[0]).toBeInstanceOf(BeansEntity);
    expect(resource.getEntities()[0]).toEqual(beansEntity);
  });

  it('should delete beans entity', () => {
    const resource = new CamelRouteResource();
    const beansEntity = resource.createBeansEntity();

    resource.deleteBeansEntity(beansEntity);

    expect(resource.getEntities()).toHaveLength(0);
  });

  describe('removeEntity', () => {
    it('should not do anything if the ID is not provided', () => {
      const resource = new CamelRouteResource([camelRouteJson]);

      resource.removeEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should not do anything when providing a non existing ID', () => {
      const resource = new CamelRouteResource([camelRouteJson]);

      resource.removeEntity('non-existing-id');

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should allow to remove an entity', () => {
      const resource = new CamelRouteResource([camelRouteJson, camelFromJson]);
      const camelRouteEntity = resource.getVisualEntities()[0];

      resource.removeEntity(camelRouteEntity.id);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should NOT create a new entity after deleting them all', () => {
      const resource = new CamelRouteResource([camelRouteJson]);
      const camelRouteEntity = resource.getVisualEntities()[0];

      resource.removeEntity(camelRouteEntity.id);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });
  });

  describe('getCompatibleComponents', () => {
    it('should delegate to the CamelComponentFilterService', () => {
      const filterSpy = jest.spyOn(CamelComponentFilterService, 'getCamelCompatibleComponents');

      const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
      resource.getCompatibleComponents(AddStepMode.ReplaceStep, { path: 'from', label: 'timer' });

      expect(filterSpy).toHaveBeenCalledWith(AddStepMode.ReplaceStep, { path: 'from', label: 'timer' }, undefined);
    });
  });

  describe('toJson', () => {
    const testCases: [CamelYamlDsl][] = [
      [[camelRouteJson]],
      [[camelFromJson]],
      [[{ from: { uri: 'direct:foo', steps: [] } }]],
      [{ from: 'direct:foo' } as unknown as CamelYamlDsl],
      [{ from: { uri: 'direct:foo' } } as unknown as CamelYamlDsl],
      [[{ beans: [] }]],
      [[{ errorHandler: {} }]],
      [[{ intercept: {} }]],
      [[{ interceptFrom: {} }]],
      [{ interceptSendToEndpoint: {} } as unknown as CamelYamlDsl],
      [{ onCompletion: {} } as unknown as CamelYamlDsl],
      [{ onException: {} } as unknown as CamelYamlDsl],
      [{ rest: {} } as unknown as CamelYamlDsl],
      [[{ restConfiguration: {} }]],
      [{ route: {} } as unknown as CamelYamlDsl],
      [[{ routeConfiguration: {} }]],
      [[{ routeTemplate: {} }] as unknown as CamelYamlDsl],
      [{ templatedRoute: {} } as unknown as CamelYamlDsl],
      [{ anotherUnknownContent: {} } as unknown as CamelYamlDsl],
      [{} as CamelYamlDsl],
    ];
    it.each(testCases)('should not throw error when calling: %s', (json) => {
      const resource = new CamelRouteResource(json);
      const firstEntity = resource.getVisualEntities()[0] ?? resource.getEntities()[0];
      expect(firstEntity.toJSON()).not.toBeUndefined();
    });
  });
});
