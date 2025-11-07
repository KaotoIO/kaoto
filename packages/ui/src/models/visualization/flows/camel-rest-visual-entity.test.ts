import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Rest } from '@kaoto/camel-catalog/types';
import { restStub } from '../../../stubs/rest';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
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
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
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

  it('should delegate to super return node label', () => {
    const superGetNodeLabelSpy = jest
      .spyOn(AbstractCamelVisualEntity.prototype, 'getNodeLabel')
      .mockReturnValueOnce('label');
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getNodeLabel()).toEqual('label');
    expect(superGetNodeLabelSpy).toHaveBeenCalled();
  });

  it('should delegate to super return node tooltip', () => {
    const superGetNodeLabelSpy = jest
      .spyOn(AbstractCamelVisualEntity.prototype, 'getTooltipContent')
      .mockReturnValueOnce('tooltip');
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getTooltipContent()).toEqual('tooltip');
    expect(superGetNodeLabelSpy).toHaveBeenCalled();
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

    it('should delegate to super for non-REST method paths', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superGetNodeDefinitionSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeDefinition');

      // Use a path where method is NOT in REST_DSL_METHODS
      entity.getNodeDefinition('rest.unknown.0');

      expect(superGetNodeDefinitionSpy).toHaveBeenCalledWith('rest.unknown.0');
    });
  });

  it('should return schema from store', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getNodeSchema(CamelRestVisualEntity.ROOT_PATH)).toEqual(restSchema);
  });

  describe('getNodeSchema', () => {
    it('should return REST method schema for REST DSL methods', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const getComponentSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      entity.getNodeSchema('rest.get.0');

      expect(getComponentSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'get');
    });

    it('should return REST method schema for POST method', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const getComponentSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      entity.getNodeSchema('rest.post.0');

      expect(getComponentSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'post');
    });

    it('should delegate to super for non-REST method paths', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superGetNodeSchemaSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeSchema');

      // Use a path where method is NOT in REST_DSL_METHODS
      entity.getNodeSchema('rest.unknown.0');

      expect(superGetNodeSchemaSpy).toHaveBeenCalledWith('rest.unknown.0');
    });

    it('should handle undefined path by delegating to super', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superGetNodeSchemaSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeSchema');

      entity.getNodeSchema();

      expect(superGetNodeSchemaSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it('should return omit form fields', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getOmitFormFields()).toEqual(['get', 'post', 'put', 'delete', 'head', 'patch']);
  });

  it('should return root path', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getRootPath()).toEqual('rest');
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

      expect(restDef.rest.bindingMode).toEqual('auto');
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

  it('return no interactions', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getNodeInteraction()).toEqual({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: true,
    });
  });

  describe('getNodeValidationText', () => {
    it('should return undefined for valid definitions', () => {
      const entity = new CamelRestVisualEntity({
        rest: {
          ...restDef.rest,
          bindingMode: 'json',
        },
      });

      expect(entity.getNodeValidationText()).toBeUndefined();
    });

    it('should not modify the original definition when validating', () => {
      const originalRestDef: Rest = { ...restDef.rest };
      const entity = new CamelRestVisualEntity(restDef);

      entity.getNodeValidationText();

      expect(restDef.rest).toEqual(originalRestDef);
    });

    it('should NOT return errors when there is an invalid property', () => {
      const invalidRestDef: Rest = {
        ...restDef.rest,
        bindingMode: 'true' as unknown as Rest['bindingMode'],
        openApi: 'true' as unknown as Rest['openApi'],
      };
      const entity = new CamelRestVisualEntity({ rest: invalidRestDef });

      expect(entity.getNodeValidationText()).toBeUndefined();
    });
  });

  describe('toVizNode', () => {
    it('should return visualization node', () => {
      const entity = new CamelRestVisualEntity(restDef);

      const vizNode = entity.toVizNode();

      expect(vizNode.data).toEqual({
        componentName: undefined,
        entity,
        icon: '',
        isGroup: true,
        path: 'rest',
        processorName: 'rest',
      });
    });
  });

  it('should serialize the rest definition', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.toJSON()).toEqual(restDef);
  });
});
