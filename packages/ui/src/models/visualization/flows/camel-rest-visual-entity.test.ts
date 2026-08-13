import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition, Rest, To2 } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { restStub } from '../../../stubs/rest';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { DefinedComponent } from '../../camel/camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { PlaceholderType } from '../../placeholder.constants';
import { REST_ELEMENT_NAME } from '../../special-processors.constants';
import { AddStepMode } from '../base-visual-entity';
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

  it('should delegate to super return node label', () => {
    const superGetNodeLabelSpy = vi
      .spyOn(AbstractCamelVisualEntity.prototype, 'getNodeLabel')
      .mockReturnValueOnce('label');
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getNodeLabel()).toBe('label');
    expect(superGetNodeLabelSpy).toHaveBeenCalled();
  });

  it('should return "verb" for placeholder path', () => {
    const entity = new CamelRestVisualEntity(restDef);
    expect(entity.getNodeLabel('rest.placeholder')).toBe('verb');
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
      const superGetNodeDefinitionSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeDefinition');

      // Use a path where method is NOT in REST_DSL_METHODS
      entity.getNodeDefinition('rest.unknown.0');

      expect(superGetNodeDefinitionSpy).toHaveBeenCalledWith('rest.unknown.0');
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
          get: [{ id: 'get-1', path: '/hello' }],
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

  it('should return omit form fields', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.getOmitFormFields()).toEqual([
      'from',
      'outputs',
      'steps',
      'when',
      'otherwise',
      'doCatch',
      'doFinally',
    ]);
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

  describe('getNodeInteraction', () => {
    it('should return interactions for root path', () => {
      const entity = new CamelRestVisualEntity(restDef);

      expect(
        entity.getNodeInteraction({
          name: REST_ELEMENT_NAME,
          path: 'rest',
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        }),
      ).toEqual({
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: true,
        canRemoveStep: false,
        canReplaceStep: false,
        canRemoveFlow: true,
        canBeDisabled: true,
      });
    });

    it('should return interactions for to path', () => {
      const restDefWithGet = {
        rest: {
          ...restDef.rest,
          get: [{ path: '/hello', to: { uri: 'direct:hello' } }],
        },
      };
      const entity = new CamelRestVisualEntity(restDefWithGet);

      expect(
        entity.getNodeInteraction({
          name: 'direct',
          path: 'rest.get.0.to',
          processorName: 'to',
          isPlaceholder: false,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
        }),
      ).toEqual({
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: false,
        canRemoveStep: true,
        canReplaceStep: false,
        canRemoveFlow: false,
        canBeDisabled: false,
      });
    });

    it('should delegate to super for verb path', () => {
      const restDefWithGet = {
        rest: {
          ...restDef.rest,
          get: [{ path: '/hello', to: { uri: 'direct:hello' } }],
        },
      };
      const entity = new CamelRestVisualEntity(restDefWithGet);
      const superGetNodeInteractionSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeInteraction');

      entity.getNodeInteraction({
        name: 'get',
        path: 'rest.get.0',
        processorName: 'get' as keyof ProcessorDefinition,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(superGetNodeInteractionSpy).toHaveBeenCalled();
    });
  });

  describe('addStep', () => {
    it('should delegate to super for root path', () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superAddStepSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'addStep');

      entity.addStep({
        definedComponent: { type: CatalogKind.Processor, name: 'get' } as DefinedComponent,
        mode: AddStepMode.InsertSpecialChildStep,
        data: {
          name: REST_ELEMENT_NAME,
          path: CamelRestVisualEntity.ROOT_PATH,
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        },
        targetProperty: 'get',
      });

      expect(superAddStepSpy).toHaveBeenCalled();
    });

    it('should add to directive for verb placeholder path', () => {
      const restDefWithGet: { rest: Rest } = {
        rest: {
          ...restDef.rest,
          get: [{ id: 'get-1', path: '/hello' }],
        },
      };

      const entity = new CamelRestVisualEntity(restDefWithGet);

      entity.addStep({
        definedComponent: { type: CatalogKind.Component, name: 'direct' } as DefinedComponent,
        mode: AddStepMode.ReplaceStep,
        data: {
          name: PlaceholderType.Placeholder,
          path: 'rest.get.0.to.placeholder',
          isPlaceholder: true,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
        },
      });

      const toLocal = restDefWithGet.rest.get?.[0].to as Exclude<To2, string>;

      expect(toLocal).toBeDefined();
      expect(toLocal?.uri).toBe('direct');
    });

    it('should not add step when path is undefined', () => {
      const entity = new CamelRestVisualEntity(restDef);

      entity.addStep({
        definedComponent: { type: CatalogKind.Component, name: 'direct' } as DefinedComponent,
        mode: AddStepMode.ReplaceStep,
        data: {
          name: PlaceholderType.Placeholder,
          path: undefined,
          isPlaceholder: true,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
        },
      });

      // Should not throw and rest should remain unchanged
      expect(restDef.rest).toEqual(restStub.rest);
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

  it('toVizNode should return visualization node', async () => {
    const entity = new CamelRestVisualEntity(restDef);

    const vizNode = await entity.toVizNode();
    await vizNode.fetchSchema();

    expect(vizNode.data).toEqual({
      entity,
      name: 'rest',
      isGroup: true,
      path: 'rest',
      processorName: 'rest',
      primaryNodeId: { name: entity.type, catalogKind: CatalogKind.Entity },
      iconAlt: 'Entity icon',
      iconUrl: '/src/assets/components/generic-component.png',
      isPlaceholder: false,
      title: 'Rest',
      description: 'rest: Defines a rest service using the rest-dsl',
      processorIconTooltip: '',
      schema: expect.any(Object),
    });
  });

  it('should serialize the rest definition', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.toJSON()).toEqual(restDef);
  });
});
