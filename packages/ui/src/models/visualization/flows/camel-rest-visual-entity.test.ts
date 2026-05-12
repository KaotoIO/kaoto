import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition, Rest, To2 } from '@kaoto/camel-catalog/types';

import { restStub } from '../../../stubs/rest';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { DefinedComponent } from '../../camel/camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { PlaceholderType } from '../../placeholder.constants';
import { REST_ELEMENT_NAME } from '../../special-processors.constants';
import { AddStepMode } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelRestVisualEntity } from './camel-rest-visual-entity';
import { setupDynamicCatalogRegistryMock } from './dynamic-catalog-registry-mock';

jest.mock('../../../dynamic-catalog/dynamic-catalog-registry');

describe('CamelRestVisualEntity', () => {
  const REST_ID_REGEXP = /^rest-[a-zA-Z0-9]{4}$/;
  let restDef: { rest: Rest };
  let restSchema: KaotoSchemaDefinition['schema'];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    restSchema = catalogsMap.entitiesCatalog[EntityType.Rest].propertiesSchema as KaotoSchemaDefinition['schema'];

    setupDynamicCatalogRegistryMock(catalogsMap);
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

  it('should return "verb" for placeholder path', () => {
    const entity = new CamelRestVisualEntity(restDef);
    expect(entity.getNodeLabel('rest.placeholder')).toEqual('verb');
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

  it('should return schema from store', async () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(await entity.getNodeSchema(CamelRestVisualEntity.ROOT_PATH)).toEqual(restSchema);
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

  describe('getNodeSchema', () => {
    it('should return REST method schema for REST DSL methods', async () => {
      const entity = new CamelRestVisualEntity(restDef);
      const schema = await entity.getNodeSchema('rest.get.0');

      expect(schema).toBeDefined();
    });

    it('should return REST method schema for POST method', async () => {
      const entity = new CamelRestVisualEntity(restDef);
      const schema = await entity.getNodeSchema('rest.post.0');

      expect(schema).toBeDefined();
    });

    it('should delegate to super for non-REST method paths', async () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superGetNodeSchemaSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeSchema');

      // Use a path where method is NOT in REST_DSL_METHODS
      await entity.getNodeSchema('rest.unknown.0');

      expect(superGetNodeSchemaSpy).toHaveBeenCalledWith('rest.unknown.0');
    });

    it('should handle undefined path by delegating to super', async () => {
      const entity = new CamelRestVisualEntity(restDef);
      const superGetNodeSchemaSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeSchema');

      await entity.getNodeSchema();

      expect(superGetNodeSchemaSpy).toHaveBeenCalledWith(undefined);
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
      const superGetNodeInteractionSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getNodeInteraction');

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
      const superAddStepSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'addStep');

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
      expect(toLocal?.uri).toEqual('direct');
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
    it('should return undefined for valid definitions', async () => {
      const entity = new CamelRestVisualEntity({
        rest: {
          ...restDef.rest,
          bindingMode: 'json',
        },
      });

      expect(await entity.getNodeValidationText()).toBeUndefined();
    });

    it('should not modify the original definition when validating', async () => {
      const originalRestDef: Rest = { ...restDef.rest };
      const entity = new CamelRestVisualEntity(restDef);

      await entity.getNodeValidationText();

      expect(restDef.rest).toEqual(originalRestDef);
    });

    it('should NOT return errors when there is an invalid property', async () => {
      const invalidRestDef: Rest = {
        ...restDef.rest,
        bindingMode: 'true' as unknown as Rest['bindingMode'],
        openApi: 'true' as unknown as Rest['openApi'],
      };
      const entity = new CamelRestVisualEntity({ rest: invalidRestDef });

      expect(await entity.getNodeValidationText()).toBeUndefined();
    });
  });

  describe('toVizNode', () => {
    it('should return visualization node', async () => {
      const entity = new CamelRestVisualEntity(restDef);

      const vizNode = await entity.toVizNode();

      expect(vizNode.data).toEqual({
        entity,
        name: 'rest',
        isGroup: true,
        path: 'rest',
        processorName: 'rest',
        iconAlt: 'Entity icon',
        iconUrl: 'file-mock-data',
        isPlaceholder: false,
        title: 'Rest',
        description: 'rest: Defines a rest service using the rest-dsl',
        processorIconTooltip: '',
      });
    });
  });

  it('should serialize the rest definition', () => {
    const entity = new CamelRestVisualEntity(restDef);

    expect(entity.toJSON()).toEqual(restDef);
  });
});
