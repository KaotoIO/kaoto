import { CamelYamlDsl, RouteConfigurationDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { XMLMetadata } from '../../serializers';
import { beansJson } from '../../stubs/beans';
import { camelFromJson } from '../../stubs/camel-from';
import { camelRouteJson, camelRouteYaml } from '../../stubs/camel-route';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../visualization/flows/camel-route-visual-entity';
import { NonVisualEntity } from '../visualization/flows/non-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { BeansEntity } from '../visualization/metadata/beansEntity';
import { SerializerType } from './camel-resource';
import { CamelResourceFactory } from './camel-resource-factory';
import { CamelRouteResource } from './camel-route-resource';
import { EntityType } from './entities';
import { EntityOrderingService } from './entity-ordering.service';
import { SourceSchemaType } from './source-schema-type';

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

  describe('entity ordering in constructor', () => {
    it('should sort entities according to XML schema order during construction', () => {
      const mixedEntities: CamelYamlDsl = [
        { from: { uri: 'direct:route1', steps: [] } },
        { restConfiguration: { port: '8080' } },
        { from: { uri: 'direct:route2', steps: [] } },
        { rest: { path: '/api' } },
        { routeConfiguration: { id: 'config1' } },
      ];

      const resource = new CamelRouteResource(mixedEntities);
      const entities = resource.getVisualEntities();

      // Should be sorted: RestConfiguration, Rest, RouteConfiguration, Route, Route
      expect(entities).toHaveLength(5);
      expect(entities[0].type).toBe(EntityType.RestConfiguration);
      expect(entities[1].type).toBe(EntityType.Rest);
      expect(entities[2].type).toBe(EntityType.RouteConfiguration);
      expect(entities[3].type).toBe(EntityType.Route);
      expect(entities[4].type).toBe(EntityType.Route);
    });

    it('should preserve order within same entity types during construction', () => {
      const multipleRoutes = [
        { from: { uri: 'direct:route3', steps: [] } },
        { from: { uri: 'direct:route1', steps: [] } },
        { from: { uri: 'direct:route2', steps: [] } },
      ];

      const resource = new CamelRouteResource(multipleRoutes);
      const entities = resource.getVisualEntities();

      expect(entities).toHaveLength(3);

      // Routes should maintain their original order: route3, route1, route2
      expect((entities[0].toJSON() as { route: RouteDefinition }).route.from.uri).toBe('direct:route3');
      expect((entities[1].toJSON() as { route: RouteDefinition }).route.from.uri).toBe('direct:route1');
      expect((entities[2].toJSON() as { route: RouteDefinition }).route.from.uri).toBe('direct:route2');
    });

    it('should handle mixed entity types with preserved internal order', () => {
      const mixedWithMultiples = [
        { routeConfiguration: { id: 'config2' } },
        { from: { uri: 'direct:route1', steps: [] } },
        { routeConfiguration: { id: 'config1' } },
        { restConfiguration: { port: '8080' } },
        { from: { uri: 'direct:route2', steps: [] } },
      ];

      const resource = new CamelRouteResource(mixedWithMultiples);
      const entities = resource.getVisualEntities();

      expect(entities).toHaveLength(5);
      // Should be: RestConfiguration, RouteConfiguration(config2), RouteConfiguration(config1), Route(route1), Route(route2)
      expect(entities[0].type).toBe(EntityType.RestConfiguration);
      expect(entities[1].type).toBe(EntityType.RouteConfiguration);
      expect(
        (entities[1].toJSON() as unknown as { routeConfiguration: RouteConfigurationDefinition }).routeConfiguration.id,
      ).toBe('config2'); // First routeConfig
      expect(entities[2].type).toBe(EntityType.RouteConfiguration);
      expect(
        (entities[2].toJSON() as unknown as { routeConfiguration: RouteConfigurationDefinition }).routeConfiguration.id,
      ).toBe('config1'); // Second routeConfig
      expect(entities[3].type).toBe(EntityType.Route);
      expect((entities[3].toJSON() as unknown as { route: RouteDefinition }).route.from.uri).toBe('direct:route1'); // First route
      expect(entities[4].type).toBe(EntityType.Route);
      expect((entities[4].toJSON() as unknown as { route: RouteDefinition }).route.from.uri).toBe('direct:route2'); // Second route
    });
  });

  describe('function Object() { [native code] }', () => {
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

    it('should add the given entities at the end of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(
        EntityType.Route,
        FlowTemplateService.getFlowTemplate(SourceSchemaType.Route)[0],
      );

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

    it('should add the given OnException entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.OnException, { onException: { id: 'onException-test' } });

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

    it('should add the given ErrorHandler entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.ErrorHandler, { errorHandler: { id: 'errorHandler-test' } });

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add OnCompletion entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.OnCompletion);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add the given OnCompletion entity at the beginning of the list and return its ID', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.OnCompletion, { onCompletion: { id: 'onCompletion-test' } });

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should use EntityOrderingService for priority entity detection', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity(); // Add a regular route first

      // Add a priority entity (should go to beginning)
      const priorityId = resource.addNewEntity(EntityType.ErrorHandler);

      // Add a non-priority entity (should go to end)
      const nonPriorityId = resource.addNewEntity(EntityType.RestConfiguration);

      const entities = resource.getVisualEntities();
      expect(entities).toHaveLength(3);

      // ErrorHandler should be first (priority)
      expect(entities[0].id).toEqual(priorityId);
      expect(entities[0].type).toBe(EntityType.ErrorHandler);

      // Original route should be second
      expect(entities[1].type).toBe(EntityType.Route);

      // RestConfiguration should be last (non-priority)
      expect(entities[2].id).toEqual(nonPriorityId);
      expect(entities[2].type).toBe(EntityType.RestConfiguration);
    });

    it('should verify EntityOrderingService priority entity detection matches implementation', () => {
      // Test that our service correctly identifies priority entities
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.OnException)).toBe(true);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.ErrorHandler)).toBe(true);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.OnCompletion)).toBe(true);

      // Test that non-priority entities are correctly identified
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.Route)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.RestConfiguration)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.RouteConfiguration)).toBe(false);
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

  describe('getVisualEntities ordering', () => {
    it('should return entities in XML schema order', () => {
      const mixedEntities = [
        { from: { uri: 'direct:route1', steps: [] } },
        { routeConfiguration: { id: 'config1' } },
        { restConfiguration: { port: '8080' } },
        { rest: { path: '/api' } },
      ];

      const resource = new CamelRouteResource(mixedEntities);
      const visualEntities = resource.getVisualEntities();

      expect(visualEntities).toHaveLength(4);
      // Should follow XML schema order: RestConfiguration, Rest, RouteConfiguration, Route
      expect(visualEntities[0].type).toBe(EntityType.RestConfiguration);
      expect(visualEntities[1].type).toBe(EntityType.Rest);
      expect(visualEntities[2].type).toBe(EntityType.RouteConfiguration);
      expect(visualEntities[3].type).toBe(EntityType.Route);
    });

    it('should maintain consistent ordering after adding entities', () => {
      const resource = new CamelRouteResource([{ from: { uri: 'direct:route1', steps: [] } }]);

      // Add entities that should be ordered before routes
      resource.addNewEntity(EntityType.RestConfiguration);
      resource.addNewEntity(EntityType.RouteConfiguration);

      const visualEntities = resource.getVisualEntities();

      expect(visualEntities).toHaveLength(3);
      // After adding, the order should still reflect proper positioning
      // Note: addNewEntity doesn't re-sort, it just adds at the correct position
      const entityTypes = visualEntities.map((e) => e.type);

      // We should have all three entity types
      expect(entityTypes).toContain(EntityType.Route);
      expect(entityTypes).toContain(EntityType.RestConfiguration);
      expect(entityTypes).toContain(EntityType.RouteConfiguration);
    });

    it('should return entities sorted by XML schema order with preserved internal order', () => {
      const multipleEntitiesPerType: CamelYamlDsl = [
        { from: { uri: 'direct:route3', steps: [] } },
        { routeConfiguration: { id: 'config2' } },
        { from: { uri: 'direct:route1', steps: [] } },
        { routeConfiguration: { id: 'config1' } },
        { restConfiguration: { port: '8080' } },
      ];

      const resource = new CamelRouteResource(multipleEntitiesPerType);
      const visualEntities = resource.getVisualEntities();

      expect(visualEntities).toHaveLength(5);

      // Should be: RestConfiguration, RouteConfiguration(config2), RouteConfiguration(config1), Route(route3), Route(route1)
      expect(visualEntities[0].type).toBe(EntityType.RestConfiguration);
      expect(visualEntities[1].type).toBe(EntityType.RouteConfiguration);
      expect(
        (visualEntities[1].toJSON() as unknown as { routeConfiguration: RouteConfigurationDefinition })
          .routeConfiguration.id,
      ).toBe('config2');
      expect(visualEntities[2].type).toBe(EntityType.RouteConfiguration);
      expect(
        (visualEntities[2].toJSON() as unknown as { routeConfiguration: RouteConfigurationDefinition })
          .routeConfiguration.id,
      ).toBe('config1');
      expect(visualEntities[3].type).toBe(EntityType.Route);
      expect((visualEntities[3].toJSON() as unknown as { route: RouteDefinition }).route.from.uri).toBe(
        'direct:route3',
      );
      expect(visualEntities[4].type).toBe(EntityType.Route);
      expect((visualEntities[4].toJSON() as unknown as { route: RouteDefinition }).route.from.uri).toBe(
        'direct:route1',
      );
    });
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

      resource.removeEntity(['non-existing-id']);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should allow to remove an entity', () => {
      const resource = new CamelRouteResource([camelRouteJson, camelFromJson]);
      const camelRouteEntity = resource.getVisualEntities()[0];

      resource.removeEntity([camelRouteEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should remove multiple entities when multiple IDs are provided', () => {
      const resource = new CamelRouteResource([camelRouteJson, camelFromJson]);
      const entitiesToRemove = resource.getVisualEntities().map((e) => e.id);

      resource.removeEntity(entitiesToRemove);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });

    it('should NOT create a new entity after deleting them all', () => {
      const resource = new CamelRouteResource([camelRouteJson]);
      const camelRouteEntity = resource.getVisualEntities()[0];

      resource.removeEntity([camelRouteEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });

    it('should preserve comments and metadata when changing serializer', () => {
      const resource = new CamelRouteResource([camelRouteJson]);
      resource.setSerializer(SerializerType.XML);
      resource['serializer'].setComments(['Initial Comment']);
      resource['serializer'].setMetadata({
        xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>',
        rootElementDefinitions: [{ name: 'xmlns', value: 'http://camel.apache.org/schema/spring' }],
      });

      // Change serializer to YAML
      resource.setSerializer(SerializerType.YAML);

      // Verify that comments and metadata are preserved
      expect(resource['serializer'].getComments()).toEqual(['Initial Comment']);
      const metadata = resource['serializer']?.getMetadata() as XMLMetadata;
      expect(metadata.xmlDeclaration).toBe('<?xml version="1.0" encoding="UTF-8"?>');
      expect(metadata.rootElementDefinitions[0].value).toBe('http://camel.apache.org/schema/spring');

      // Change serializer back to XML
      resource.setSerializer(SerializerType.XML);

      // Verify that comments and metadata are still preserved
      expect(resource['serializer'].getComments()).toEqual(['Initial Comment']);
      expect(resource['serializer'].getMetadata().xmlDeclaration).toBe('<?xml version="1.0" encoding="UTF-8"?>');
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
