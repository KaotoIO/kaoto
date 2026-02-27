import { CamelYamlDsl, RouteConfigurationDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';

import { XMLMetadata } from '../../serializers';
import { beansJson } from '../../stubs/beans';
import { camelFromJson } from '../../stubs/camel-from';
import { camelRouteJson, camelRouteYaml } from '../../stubs/camel-route';
import { CatalogKind } from '../catalog-kind';
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

    describe('insertAfterEntityId', () => {
      it('should insert a duplicated route right after the original route', () => {
        const resource = new CamelRouteResource([
          { from: { uri: 'direct:route1', steps: [] } },
          { from: { uri: 'direct:route2', steps: [] } },
          { from: { uri: 'direct:route3', steps: [] } },
        ]);

        const entities = resource.getVisualEntities();
        expect(entities).toHaveLength(3);

        const route1Id = entities[0].id;

        // Duplicate route1 - should be inserted right after route1
        const newId = resource.addNewEntity(EntityType.Route, undefined, route1Id);

        const updatedEntities = resource.getVisualEntities();
        expect(updatedEntities).toHaveLength(4);
        expect(updatedEntities[0].id).toBe(route1Id);
        expect(updatedEntities[1].id).toBe(newId); // Duplicate placed right after route1
      });

      it('should insert a duplicated route after the last route when duplicating the last route', () => {
        const resource = new CamelRouteResource([
          { from: { uri: 'direct:route1', steps: [] } },
          { from: { uri: 'direct:route2', steps: [] } },
        ]);

        const entities = resource.getVisualEntities();
        const route2Id = entities[1].id;

        const newId = resource.addNewEntity(EntityType.Route, undefined, route2Id);

        const updatedEntities = resource.getVisualEntities();
        expect(updatedEntities).toHaveLength(3);
        expect(updatedEntities[1].id).toBe(route2Id);
        expect(updatedEntities[2].id).toBe(newId); // Duplicate placed right after route2
      });

      it('should insert after the specified entity among mixed entity types', () => {
        const resource = new CamelRouteResource([
          { routeConfiguration: { id: 'config1' } },
          { from: { uri: 'direct:route1', steps: [] } },
          { from: { uri: 'direct:route2', steps: [] } },
        ]);

        const entities = resource.getVisualEntities();
        const route1Id = entities.find((e) => e.type === EntityType.Route)!.id;

        const newId = resource.addNewEntity(EntityType.Route, undefined, route1Id);

        const updatedEntities = resource.getVisualEntities();
        expect(updatedEntities).toHaveLength(4);

        // Find the route entities in order
        const routeEntities = updatedEntities.filter((e) => e.type === EntityType.Route);
        expect(routeEntities).toHaveLength(3);
        expect(routeEntities[0].id).toBe(route1Id);
        expect(routeEntities[1].id).toBe(newId); // Duplicate right after route1
      });

      it('should fall back to default ordering when insertAfterEntityId is not found', () => {
        const resource = new CamelRouteResource([
          { from: { uri: 'direct:route1', steps: [] } },
        ]);

        const newId = resource.addNewEntity(EntityType.Route, undefined, 'non-existing-id');

        const updatedEntities = resource.getVisualEntities();
        expect(updatedEntities).toHaveLength(2);
        expect(updatedEntities[1].id).toBe(newId); // Falls back to end
      });

      it('should fall back to default ordering when insertAfterEntityId is not provided', () => {
        const resource = new CamelRouteResource([
          { from: { uri: 'direct:route1', steps: [] } },
        ]);

        const newId = resource.addNewEntity(EntityType.Route);

        const updatedEntities = resource.getVisualEntities();
        expect(updatedEntities).toHaveLength(2);
        expect(updatedEntities[1].id).toBe(newId);
      });
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

  describe('beans entity management', () => {
    it('should create beans entity with empty beans array', () => {
      const resource = new CamelRouteResource();
      const beansEntity = resource.createBeansEntity();

      expect(beansEntity).toBeInstanceOf(BeansEntity);
      expect(beansEntity.toJSON()).toEqual({ beans: [] });
      expect(resource.getEntities()).toContain(beansEntity);
    });

    it('should delete the correct beans entity when multiple exist', () => {
      const resource = new CamelRouteResource();
      const firstBeansEntity = resource.createBeansEntity();
      const secondBeansEntity = resource.createBeansEntity();

      expect(resource.getEntities()).toHaveLength(2);

      resource.deleteBeansEntity(firstBeansEntity);

      expect(resource.getEntities()).toHaveLength(1);
      expect(resource.getEntities()[0]).toBe(secondBeansEntity);
    });

    it('should not fail when trying to delete non-existing beans entity', () => {
      const resource = new CamelRouteResource();
      const beansEntity = new BeansEntity({ beans: [] });

      expect(() => resource.deleteBeansEntity(beansEntity)).not.toThrow();
      expect(resource.getEntities()).toHaveLength(0);
    });

    it('should handle beans entities in mixed entity lists', () => {
      const resource = new CamelRouteResource();
      resource.addNewEntity(); // Add a route
      const beansEntity = resource.createBeansEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getEntities()).toHaveLength(1);
      expect(resource.getEntities()[0]).toBe(beansEntity);

      resource.deleteBeansEntity(beansEntity);

      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getEntities()).toHaveLength(0);
    });
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

  describe('getCanvasEntityList', () => {
    it('should return all entities for YAML serializer', () => {
      const resource = new CamelRouteResource();
      resource.setSerializer(SerializerType.YAML);

      const entityList = resource.getCanvasEntityList();

      // YAML should include all entities including YAML-only ones
      expect(entityList.common).toHaveLength(1); // Route
      expect(entityList.groups['Configuration']).toBeDefined();
      expect(entityList.groups['Configuration']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: EntityType.RouteConfiguration }),
          expect.objectContaining({ name: EntityType.Intercept }),
          expect.objectContaining({ name: EntityType.InterceptFrom }),
          expect.objectContaining({ name: EntityType.InterceptSendToEndpoint }),
          expect.objectContaining({ name: EntityType.OnCompletion }),
        ]),
      );
      expect(entityList.groups['Error Handling']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: EntityType.OnException }),
          expect.objectContaining({ name: EntityType.ErrorHandler }),
        ]),
      );
      expect(entityList.groups['Rest']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: EntityType.RestConfiguration }),
          expect.objectContaining({ name: EntityType.Rest }),
        ]),
      );
    });

    it('should filter out YAML-only entities for XML serializer', () => {
      const resource = new CamelRouteResource();
      resource.setSerializer(SerializerType.XML);

      const entityList = resource.getCanvasEntityList();

      // XML should not include YAML-only entities
      expect(entityList.common).toHaveLength(1); // Route
      expect(entityList.groups['Configuration']).toHaveLength(1); // Only RouteConfiguration
      expect(entityList.groups['Configuration']).toEqual([
        expect.objectContaining({ name: EntityType.RouteConfiguration }),
      ]);

      // Should not include YAML-only entities
      const allEntityNames = [
        ...entityList.common.map((e) => e.name),
        ...Object.values(entityList.groups)
          .flat()
          .map((e) => e.name),
      ];
      expect(allEntityNames).not.toContain(EntityType.Intercept);
      expect(allEntityNames).not.toContain(EntityType.InterceptFrom);
      expect(allEntityNames).not.toContain(EntityType.InterceptSendToEndpoint);
      expect(allEntityNames).not.toContain(EntityType.OnCompletion);
      expect(allEntityNames).not.toContain(EntityType.OnException);
      expect(allEntityNames).not.toContain(EntityType.ErrorHandler);
    });

    it('should return consistent entity list structure on multiple calls', () => {
      const resource = new CamelRouteResource();

      const firstCall = resource.getCanvasEntityList();
      const secondCall = resource.getCanvasEntityList();

      expect(firstCall).toStrictEqual(secondCall);
    });

    it('should recreate entity list when called after serializer change', () => {
      const resource = new CamelRouteResource();
      resource.setSerializer(SerializerType.YAML);

      const yamlEntityList = resource.getCanvasEntityList();

      resource.setSerializer(SerializerType.XML);
      const xmlEntityList = resource.getCanvasEntityList();

      // Should be different objects with different content
      expect(yamlEntityList).not.toBe(xmlEntityList);
      expect(yamlEntityList.groups['Configuration']).toHaveLength(5);
      expect(xmlEntityList.groups['Configuration']).toHaveLength(1);
    });

    it('should include entity titles and descriptions from catalog', () => {
      const resource = new CamelRouteResource();

      const entityList = resource.getCanvasEntityList();

      // Check that entities have proper structure with name, title, and description
      const routeEntity = entityList.common[0];
      expect(routeEntity).toHaveProperty('name');
      expect(routeEntity).toHaveProperty('title');
      expect(routeEntity).toHaveProperty('description');
      expect(routeEntity.name).toBe(EntityType.Route);
    });

    it('should properly group entities', () => {
      const resource = new CamelRouteResource();
      resource.setSerializer(SerializerType.YAML);

      const entityList = resource.getCanvasEntityList();

      // Check that entities are properly grouped
      expect(entityList.groups).toHaveProperty('Configuration');
      expect(entityList.groups).toHaveProperty('Error Handling');
      expect(entityList.groups).toHaveProperty('Rest');

      // Route should be in common (empty group)
      expect(entityList.common).toEqual([expect.objectContaining({ name: EntityType.Route })]);
    });
  });

  describe('getSerializerType', () => {
    it('should return YAML serializer type by default', () => {
      const resource = new CamelRouteResource();
      expect(resource.getSerializerType()).toBe(SerializerType.YAML);
    });

    it('should return XML serializer type after setting XML serializer', () => {
      const resource = new CamelRouteResource();
      resource.setSerializer(SerializerType.XML);
      expect(resource.getSerializerType()).toBe(SerializerType.XML);
    });

    it('should return current serializer type after multiple changes', () => {
      const resource = new CamelRouteResource();

      resource.setSerializer(SerializerType.XML);
      expect(resource.getSerializerType()).toBe(SerializerType.XML);

      resource.setSerializer(SerializerType.YAML);
      expect(resource.getSerializerType()).toBe(SerializerType.YAML);
    });
  });

  describe('toString', () => {
    it('should delegate to serializer serialize method', () => {
      const resource = new CamelRouteResource([camelRouteJson]);
      const serialized = resource.toString();

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should support switching between serializer types', () => {
      const resource = new CamelRouteResource([camelRouteJson]);

      // Test YAML serializer
      expect(resource.getSerializerType()).toBe(SerializerType.YAML);
      const yamlOutput = resource.toString();
      expect(yamlOutput).toContain('from:');

      // Test XML serializer type change
      resource.setSerializer(SerializerType.XML);
      expect(resource.getSerializerType()).toBe(SerializerType.XML);
    });
  });

  describe('getCompatibleComponents', () => {
    it('should delegate to the CamelComponentFilterService', () => {
      const filterSpy = jest.spyOn(CamelComponentFilterService, 'getCamelCompatibleComponents');

      const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
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

  describe('edge cases and error handling', () => {
    it('should handle empty entities array in constructor', () => {
      const resource = new CamelRouteResource([]);

      expect(resource.getVisualEntities()).toHaveLength(0);
      expect(resource.getEntities()).toHaveLength(0);
    });

    it('should handle null and undefined values in entities array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entities = [camelRouteJson, null, undefined, { from: { uri: 'direct:test' } }] as any;
      const resource = new CamelRouteResource(entities);

      expect(resource.getVisualEntities()).toHaveLength(2); // Only valid entities
    });

    it('should handle malformed entities gracefully', () => {
      const malformedEntities = [
        { invalidKey: 'invalid' },
        { from: 'invalid-from' },
        123,
        'string-entity',
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any;

      const resource = new CamelRouteResource(malformedEntities);

      // Should create NonVisualEntity for unrecognized entities
      expect(resource.getEntities()).toHaveLength(5); // All become NonVisualEntity
    });

    it('should maintain entity order after multiple operations', () => {
      const resource = new CamelRouteResource([
        { routeConfiguration: { id: 'config1' } },
        { from: { uri: 'direct:route1', steps: [] } },
      ]);

      const initialCount = resource.getVisualEntities().length;

      // Add more entities
      resource.addNewEntity(EntityType.RestConfiguration);
      resource.addNewEntity(EntityType.OnException); // Priority entity

      const entities = resource.getVisualEntities();

      const result = entities.map((entity) => entity.type);

      expect(result).toEqual([
        EntityType.RestConfiguration,
        EntityType.OnException,
        EntityType.RouteConfiguration,
        EntityType.Route,
      ]);
      expect(entities).toHaveLength(initialCount + 2);
    });

    it('should handle getEntity with array input', () => {
      // This tests the private getEntity method indirectly
      const arrayInput = [{ from: { uri: 'direct:test' } }];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resourceWithArray = new CamelRouteResource(arrayInput as any);

      expect(resourceWithArray.getVisualEntities()).toHaveLength(1);
    });

    it('should support template parameter in addNewEntity for all entity types', () => {
      const resource = new CamelRouteResource();

      // Test with RouteConfiguration template
      const configTemplate = { routeConfiguration: { id: 'custom-config', description: 'Custom configuration' } };
      const configId = resource.addNewEntity(EntityType.RouteConfiguration, configTemplate);

      const configEntity = resource.getVisualEntities().find((e) => e.id === configId);
      expect(configEntity?.type).toBe(EntityType.RouteConfiguration);

      // Test with Route template
      const routeTemplate = { from: { uri: 'timer:custom', steps: [{ to: { uri: 'log:info' } }] } };
      const routeId = resource.addNewEntity(EntityType.Route, routeTemplate);

      const routeEntity = resource.getVisualEntities().find((e) => e.id === routeId);
      expect(routeEntity?.type).toBe(EntityType.Route);
    });
  });
});
