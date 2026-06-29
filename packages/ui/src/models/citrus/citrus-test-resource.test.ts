import { ITile } from '../../components/Catalog';
import { citrusTestJson } from '../../stubs/citrus-test';
import { SourceSchemaType } from '../camel';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
import { AddStepMode, CitrusTestVisualEntity } from '../visualization';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { CitrusTestResource } from './citrus-test-resource';
import { Test } from './entities/Test';

describe('CitrusTestResource', () => {
  it('should initialize Citrus test if no args is specified', async () => {
    const resource = new CitrusTestResource();
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toHaveLength(0);
  });

  it('should initialize Citrus test', async () => {
    const resource = new CitrusTestResource(citrusTestJson);
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toHaveLength(1);
    const vis = resource.getVisualEntities()[0];
    expect(vis.test).toBeDefined();
    expect(vis.test.actions).toBeDefined();
    expect(vis.test.name).toBeDefined();
  });

  describe('addNewEntity', () => {
    it('should add new entity and return its ID', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      const id = resource.addNewEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getVisualEntities()[0].id).toEqual(id);
    });

    it('should add new entities at the end of the list and return its ID', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.Test);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[1].id).toEqual(id);
    });

    it('should add the given entities at the end of the list and return its ID', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      resource.addNewEntity();
      const id = resource.addNewEntity(EntityType.Test, FlowTemplateService.getFlowTemplate(SourceSchemaType.Test)[0]);

      expect(resource.getVisualEntities()).toHaveLength(2);
      expect(resource.getVisualEntities()[1].id).toEqual(id);
    });
  });

  it('should return the right type', async () => {
    const resource = new CitrusTestResource();
    await resource.initialize();
    expect(resource.getType()).toEqual(SourceSchemaType.Test);
  });

  it('should not allow consumers to have multiple visual entities', async () => {
    const resource = new CitrusTestResource();
    await resource.initialize();
    expect(resource.supportsMultipleVisualEntities()).toBe(false);
  });

  it('should return visual entities', async () => {
    const resource = new CitrusTestResource(citrusTestJson);
    await resource.initialize();
    expect(resource.getVisualEntities()).toHaveLength(1);
    expect(resource.getVisualEntities()[0]).toBeInstanceOf(CitrusTestVisualEntity);
    expect(resource.getEntities()).toHaveLength(0);
  });

  it('should return entities', async () => {
    const resource = new CitrusTestResource(citrusTestJson);
    await resource.initialize();
    expect(resource.getEntities()).toHaveLength(0);
    expect(resource.getVisualEntities()).toHaveLength(1);
  });

  describe('toJSON', () => {
    it('should return JSON', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      expect(resource.toJSON()).toMatchSnapshot();
    });
  });

  describe('removeEntity', () => {
    it('should not do anything if the ID is not provided', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      resource.removeEntity();

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should not do anything when providing a non existing ID', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      resource.removeEntity(['non-existing-id']);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should allow to remove an entity', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      resource.addNewEntity();
      expect(resource.getVisualEntities()).toHaveLength(2);

      const citrusTestEntity = resource.getVisualEntities()[0];

      resource.removeEntity([citrusTestEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('should remove multiple entities when multiple IDs are provided', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      resource.addNewEntity();
      const entitiesToRemove = resource.getVisualEntities().map((e) => e.id);

      resource.removeEntity(entitiesToRemove);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });

    it('should NOT create a new entity after deleting them all', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      const citrusTestEntity = resource.getVisualEntities()[0];

      resource.removeEntity([citrusTestEntity.id]);

      expect(resource.getVisualEntities()).toHaveLength(0);
    });
  });

  describe('getCanvasEntityList', () => {
    it('should return all entities', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      const entityList = resource.getCanvasEntityList();

      expect(entityList.common).toHaveLength(1); // Test
      expect(entityList.groups).toEqual({});
    });

    it('should return consistent entity list structure on multiple calls', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      const firstCall = resource.getCanvasEntityList();
      const secondCall = resource.getCanvasEntityList();

      expect(firstCall).toStrictEqual(secondCall);
    });

    it('should include entity titles and descriptions from catalog', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      const entityList = resource.getCanvasEntityList();

      // Check that entities have proper structure with name, title, and description
      const testEntity = entityList.common[0];
      expect(testEntity).toHaveProperty('name');
      expect(testEntity).toHaveProperty('title');
      expect(testEntity).toHaveProperty('description');
      expect(testEntity.name).toBe(EntityType.Test);
    });

    it('should properly group entities', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();

      const entityList = resource.getCanvasEntityList();

      // Check that entities are properly grouped
      expect(entityList.groups).toEqual({});

      // Test should be in common (empty group)
      expect(entityList.common).toEqual([expect.objectContaining({ name: EntityType.Test })]);
    });
  });

  describe('toString', () => {
    it('should delegate to serializer serialize method', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      const serialized = await resource.toSourceCode();

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should serialize to YAML', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();

      const yamlOutput = await resource.toSourceCode();
      expect(yamlOutput).toContain('actions:');
    });
  });

  describe('getCompatibleRuntimes', () => {
    it('should return the correct list of compatible runtimes', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Citrus']);
    });

    it('should return the same list regardless of resource content', async () => {
      const emptyResource = new CitrusTestResource();
      await emptyResource.initialize();
      const resourceWithTest = new CitrusTestResource(citrusTestJson);
      await resourceWithTest.initialize();

      expect(emptyResource.getCompatibleRuntimes()).toEqual(resourceWithTest.getCompatibleRuntimes());
    });

    it('should return an array with one runtime name', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      const compatibleRuntimes = resource.getCompatibleRuntimes();

      expect(compatibleRuntimes).toEqual(['Citrus']);
    });
  });

  describe('getCompatibleComponents', () => {
    it('should get compatible types', async () => {
      const resource = new CitrusTestResource(citrusTestJson);
      await resource.initialize();
      const tileFilter = resource.getCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'print',
        path: 'actions.0',
        label: 'print',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: 'Print',
        description: '',
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

  it('serializes to YAML without a serializer', async () => {
    const resource = new CitrusTestResource({ name: 't', actions: [] });
    await resource.initialize();
    const output = await resource.toSourceCode();

    expect(typeof output).toBe('string');
  });

  describe('initialize() with array input', () => {
    it('parses an array of raw test entities', async () => {
      const secondTest = { name: 'second-test', actions: [{ echo: { message: 'hi' } }] };
      const resource = new CitrusTestResource([citrusTestJson, secondTest]);
      await resource.initialize();
      expect(resource.getVisualEntities()).toHaveLength(2);
    });

    it('skips null entries inside the array', async () => {
      const resource = new CitrusTestResource([null as unknown as Test, citrusTestJson]);
      await resource.initialize();
      // null is filtered by getEntity() returning undefined
      expect(resource.getVisualEntities()).toHaveLength(1);
    });

    it('skips nested array entries inside the raw array', async () => {
      const resource = new CitrusTestResource([[] as unknown as Test, citrusTestJson]);
      await resource.initialize();
      expect(resource.getVisualEntities()).toHaveLength(1);
    });
  });

  describe('getEntity() wraps unknown raw items in NonVisualEntity', () => {
    it('places an unrecognised raw object into non-visual entities', async () => {
      // An object without both 'name' and 'actions' does not satisfy isCitrusTest
      const unknownObj = { foo: 'bar', baz: 'qux' } as unknown as Test;
      const resource = new CitrusTestResource(unknownObj);
      await resource.initialize();
      // The unknown object ends up as a NonVisualEntity (not a visual entity)
      expect(resource.getVisualEntities()).toHaveLength(0);
      expect(resource.getEntities()).toHaveLength(1);
    });
  });

  describe('toJSON() edge cases', () => {
    it('returns {} when no entities are present (before initialize)', async () => {
      const resource = new CitrusTestResource();
      // deliberately do NOT call initialize()
      expect(resource.toJSON()).toEqual({});
    });

    it('returns {} after initialize with no rawEntities', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      expect(resource.toJSON()).toEqual({});
    });
  });

  describe('toString() edge cases', () => {
    it('returns the YAML for {} when there are no entities', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      // stringify({}) produces '{}\n'
      const output = await resource.toSourceCode();

      expect(output).toBe('{}\n');
    });
  });

  describe('addNewEntity() branch: unsupported non-Test entity type', () => {
    it('falls through to create a CitrusTestVisualEntity when entity type is not in supportedEntities', async () => {
      const resource = new CitrusTestResource();
      await resource.initialize();
      // EntityType.Route is not a supported Citrus entity type
      const id = resource.addNewEntity(EntityType.Route);
      expect(id).not.toBe('');
      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getVisualEntities()[0]).toBeInstanceOf(CitrusTestVisualEntity);
    });
  });
});
