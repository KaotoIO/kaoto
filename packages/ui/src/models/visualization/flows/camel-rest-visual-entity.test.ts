import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Rest } from '@kaoto/camel-catalog/types';
import { restStub } from '../../../stubs/rest';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRestVisualEntity } from './camel-rest-visual-entity';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';

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

  describe('getComponentSchema', () => {
    it('should return entity current definition', () => {
      const entity = new CamelRestVisualEntity(restDef);

      expect(entity.getComponentSchema(CamelRestVisualEntity.ROOT_PATH)?.definition).toEqual(restDef.rest);
    });

    it('should return schema from store', () => {
      const entity = new CamelRestVisualEntity(restDef);

      expect(entity.getComponentSchema(CamelRestVisualEntity.ROOT_PATH)?.schema).toEqual(restSchema);
    });
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

      const vizNode = entity.toVizNode().nodes[0];

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
