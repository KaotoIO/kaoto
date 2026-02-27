import { ITile } from '../../components/Catalog';
import { citrusTestJson } from '../../stubs/citrus-test';
import { SerializerType, SourceSchemaType } from '../camel';
import { EntityType } from '../camel/entities';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode, CitrusTestVisualEntity } from '../visualization';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { CitrusTestResource } from './citrus-test-resource';

describe('CitrusTestResource', () => {
  it('should initialize Citrus test if no args is specified', () => {
    const resource = new CitrusTestResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(0);
  });

  it('should initialize Citrus test', () => {
    const resource = new CitrusTestResource(citrusTestJson);
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities().length).toEqual(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.test).toBeDefined();
    expect(vis.test.actions).toBeDefined();
    expect(vis.test.name).toBeDefined();
  });

  describe('addNewEntity', () => {
    it('should add new entity and return its ID', () => {
      const resource = new CitrusTestResource();
      const id = resource.addNewEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add new entities at the end of the list and return its ID', () => {
      const resource = new CitrusTestResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.Test);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[1].id).toEqual(id);
    });

    it('should add the given entities at the end of the list and return its ID', () => {
      const resource = new CitrusTestResource();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.Test, FlowTemplateService.getFlowTemplate(SourceSchemaType.Test)[0]);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[1].id).toEqual(id);
    });
  });

  it('should return the right type', () => {
    const resource = new CitrusTestResource();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
  });

  it('should not allow consumers to have multiple visual entities', () => {
    const resource = new CitrusTestResource();
    expect(resource.supportsMultipleVisualEntities()).toEqual(false);
  });

  it('should return visual entities', () => {
    const resource = new CitrusTestResource(citrusTestJson);
    expect(resource.getVisualEntities()).toHaveLength(1);
    expect(resource.getVisualEntities()[0]).toBeInstanceOf(CitrusTestVisualEntity);
    expect(resource.getEntities()).toHaveLength(0);
  });

  it('should return entities', () => {
    const resource = new CitrusTestResource(citrusTestJson);
    expect(resource.getEntities()).toHaveLength(0);
    expect(resource.getVisualEntities()).toHaveLength(1);
  });

  describe('toJSON', () => {
    it('should return JSON', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      expect(resource.toJSON()).toMatchSnapshot();
    });
  });

  describe('removeEntity', () => {
    it('should not do anything if the ID is not provided', () => {
      const resource = new CitrusTestResource(citrusTestJson);

      resource.removeEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should not do anything when providing a non existing ID', () => {
      const resource = new CitrusTestResource(citrusTestJson);

      resource.removeEntity(['non-existing-id']);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should allow to remove an entity', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      resource.addNewEntity();
      expect(resource.getVisualEntities()).toHaveLength(2);

      const citrusTestEntity = resource.getVisualEntities()[0];

      resource.removeEntity([citrusTestEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should remove multiple entities when multiple IDs are provided', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      resource.addNewEntity();
      const entitiesToRemove = resource.getVisualEntities().map((e) => e.id);

      resource.removeEntity(entitiesToRemove);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });

    it('should NOT create a new entity after deleting them all', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      const citrusTestEntity = resource.getVisualEntities()[0];

      resource.removeEntity([citrusTestEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });
  });

  describe('getCanvasEntityList', () => {
    it('should return all entities for YAML serializer', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      resource.setSerializer(SerializerType.YAML);

      const entityList = resource.getCanvasEntityList();

      // YAML should include all entities including YAML-only ones
      expect(entityList.common).toHaveLength(1); // Test
      expect(entityList.groups).toEqual({});
    });

    it('should return consistent entity list structure on multiple calls', () => {
      const resource = new CitrusTestResource(citrusTestJson);

      const firstCall = resource.getCanvasEntityList();
      const secondCall = resource.getCanvasEntityList();

      expect(firstCall).toStrictEqual(secondCall);
    });

    it('should recreate entity list when called after serializer change', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      resource.setSerializer(SerializerType.YAML);

      const yamlEntityList = resource.getCanvasEntityList();

      resource.setSerializer(SerializerType.XML);
      const xmlEntityList = resource.getCanvasEntityList();

      // Should be different objects with different content
      expect(yamlEntityList).not.toBe(xmlEntityList);
      expect(yamlEntityList.common).toHaveLength(1);
      expect(xmlEntityList.common).toHaveLength(1);
    });

    it('should include entity titles and descriptions from catalog', () => {
      const resource = new CitrusTestResource(citrusTestJson);

      const entityList = resource.getCanvasEntityList();

      // Check that entities have proper structure with name, title, and description
      const testEntity = entityList.common[0];
      expect(testEntity).toHaveProperty('name');
      expect(testEntity).toHaveProperty('title');
      expect(testEntity).toHaveProperty('description');
      expect(testEntity.name).toBe(EntityType.Test);
    });

    it('should properly group entities', () => {
      const resource = new CitrusTestResource();
      resource.setSerializer(SerializerType.YAML);

      const entityList = resource.getCanvasEntityList();

      // Check that entities are properly grouped
      expect(entityList.groups).toEqual({});

      // Test should be in common (empty group)
      expect(entityList.common).toEqual([expect.objectContaining({ name: EntityType.Test })]);
    });
  });

  describe('toString', () => {
    it('should delegate to serializer serialize method', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      const serialized = resource.toString();

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should support switching between serializer types', () => {
      const resource = new CitrusTestResource(citrusTestJson);

      // Test YAML serializer
      expect(resource.getSerializerType()).toBe(SerializerType.YAML);
      const yamlOutput = resource.toString();
      expect(yamlOutput).toContain('actions:');

      // Test XML serializer type change
      resource.setSerializer(SerializerType.XML);
      expect(resource.getSerializerType()).toBe(SerializerType.XML);
    });
  });

  describe('getCompatibleComponents', () => {
    it('should get compatible types', () => {
      const resource = new CitrusTestResource(citrusTestJson);
      const tileFilter = resource.getCompatibleComponents(AddStepMode.ReplaceStep, {
        catalogKind: CatalogKind.TestAction,
        name: 'print',
        path: 'actions.0',
        label: 'print',
      });

      expect(
        tileFilter({
          type: CatalogKind.TestAction,
          name: 'echo',
          title: 'Echo',
        } as ITile),
      ).toBeTruthy();

      expect(
        tileFilter({
          type: CatalogKind.TestContainer,
          name: 'iterate',
          title: 'Iterate',
        } as ITile),
      ).toBeTruthy();

      expect(
        tileFilter({
          type: CatalogKind.TestEndpoint,
          name: 'foo',
          title: 'Foo',
        } as ITile),
      ).toBeFalsy();
    });
  });
});
