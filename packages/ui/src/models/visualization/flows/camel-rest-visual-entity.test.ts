import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Rest } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { restStub } from '../../../stubs/rest';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRestVisualEntity } from './camel-rest-visual-entity';

describe('CamelRestVisualEntity', () => {
  const REST_ID_REGEXP = /^rest-[a-zA-Z0-9]{4}$/;
  let restDef: { rest: Rest };
  let restSchema: KaotoSchemaDefinition['schema'];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    restSchema = catalogsMap.entitiesCatalog[EntityType.Rest].propertiesSchema as KaotoSchemaDefinition['schema'];
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  beforeEach(() => {
    restDef = {
      rest: {
        ...restStub.rest,
      },
    };
  });

  describe('isApplicable', () => {
    it.each([
      [true, { rest: {} }],
      [true, { rest: { bindingMode: 'off' } }],
      [true, restStub],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { rest: { bindingMode: 'off' }, anotherProperty: true }],
      [false, undefined],
      [false, null],
      [false, []],
      [false, 'string'],
      [false, 123],
      [false, {}],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelRestVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('constructor', () => {
    it('should set id to generated id', () => {
      const entity = new CamelRestVisualEntity(restDef);

      expect(entity.id).toMatch(REST_ID_REGEXP);
    });
  });

  it('should return id', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getId()).toMatch(REST_ID_REGEXP);
  });

  it('should set id', () => {
    const entity = new CamelRestVisualEntity(restDef);
    const newId = 'newId';
    entity.setId(newId);

    expect(entity.getId()).toEqual(newId);
  });

  it('should return entity current definition', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getNodeDefinition(CamelRestVisualEntity.ROOT_PATH)).toEqual(restDef.rest);
  });

  describe('getNodeDefinition', () => {
    it('should return REST method definition for REST DSL methods', () => {
      const restDefWithGet = {
        rest: {
          ...restDef.rest,
          get: [{ path: '/hello', to: { uri: 'direct:hello' } }],
        },
      };
      const entity = new CamelRestVisualEntity(restDefWithGet);

      const definition = entity.getNodeDefinition('rest.get.0');

      expect(definition).toEqual({ path: '/hello', to: { uri: 'direct:hello' } });
    });

    it('should return REST method definition for POST method', () => {
      const restDefWithPost = {
        rest: {
          ...restDef.rest,
          post: [{ path: '/update', to: { uri: 'direct:update' } }],
        },
      };
      const entity = new CamelRestVisualEntity(restDefWithPost);

      const definition = entity.getNodeDefinition('rest.post.0');

      expect(definition).toEqual({ path: '/update', to: { uri: 'direct:update' } });
    });

    it('should return undefined for non-REST method paths', () => {
      const entity = new CamelRestVisualEntity(restDef);

      expect(entity.getNodeDefinition('rest.unknown.0')).toBeUndefined();
    });
  });

  it('should return schema from catalog', async () => {
    const entity = new CamelRestVisualEntity(restDef);

    const result = await entity.fetchNodeSchema({
      primaryNodeId: { name: EntityType.Rest, catalogKind: CatalogKind.Entity },
    });

    expect(result).toEqual(restSchema);
  });

  describe('removeStep', () => {
    it('should clean up empty verb arrays after removing step', () => {
      const restDefWithVerbs: { rest: Rest } = {
        rest: {
          get: [{ id: 'get-1', path: '/hello', to: 'direct:example' }],
          post: [],
        },
      };
      const entity = new CamelRestVisualEntity(restDefWithVerbs);
      entity.removeStep('rest.get.0');
      // After removal, empty arrays should be set to undefined
      expect(restDefWithVerbs.rest.get).toBeUndefined();
      expect(restDefWithVerbs.rest.post).toBeUndefined();
    });
  });

  describe('fetchNodeSchema', () => {
    it('should return REST method schema for GET method', async () => {
      const entity = new CamelRestVisualEntity(restDef);

      const result = await entity.fetchNodeSchema({
        primaryNodeId: { name: 'get', catalogKind: CatalogKind.Pattern },
      });

      const getEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Pattern, 'get');
      expect(result).toEqual(getEntry?.propertiesSchema);
    });

    it('should return REST method schema for POST method', async () => {
      const entity = new CamelRestVisualEntity(restDef);

      const result = await entity.fetchNodeSchema({
        primaryNodeId: { name: 'post', catalogKind: CatalogKind.Pattern },
      });

      const postEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Pattern, 'post');
      expect(result).toEqual(postEntry?.propertiesSchema);
    });

    it('should return undefined when primaryNodeId is missing', async () => {
      const entity = new CamelRestVisualEntity(restDef);

      const result = await entity.fetchNodeSchema({});

      expect(result).toBeUndefined();
    });
  });

  it('should return root path', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getRootPath()).toBe('rest');
  });

  describe('updateModel', () => {
    it('should update model', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const path = 'rest.bindingMode';
      const value = 'json';

      entity.updateModel(path, value);

      expect(restDef.rest.bindingMode).toEqual(value);
    });

    it('should not update model if path is not defined', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const value = 'json_xml';

      entity.updateModel(undefined, value);

      expect(restDef.rest.bindingMode).toBe('auto');
    });

    it('should reset the rest object if it is not defined', () => {
      const entity = new CamelRestVisualEntity(restDef);

      entity.updateModel('rest', {});

      expect(restDef.rest).toEqual({});
    });

    it('should initialize rest object if undefined after update', () => {
      const entity = new CamelRestVisualEntity(restDef);

      entity.restDef.rest = undefined as unknown as Rest;

      entity.updateModel('rest', null);

      // The updateModel should reinitialize rest to an empty object
      expect(restDef.rest).toBeDefined();
      expect(restDef.rest).toEqual({});
    });
  });

  it('should serialize the rest definition', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.toJSON()).toEqual(restDef);
  });
});
