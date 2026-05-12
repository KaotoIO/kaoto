import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RestConfiguration } from '@kaoto/camel-catalog/types';

import { restConfigurationSchema, restConfigurationStub } from '../../../stubs/rest-configuration';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { CamelRestConfigurationVisualEntity } from './camel-rest-configuration-visual-entity';
import { setupDynamicCatalogRegistryMock } from './dynamic-catalog-registry-mock';

jest.mock('../../../dynamic-catalog/dynamic-catalog-registry');

describe('CamelRestConfigurationVisualEntity', () => {
  const REST_CONFIGURATION_ID_REGEXP = /^restConfiguration-[a-zA-Z0-9]{4}$/;
  let restConfigurationDef: { restConfiguration: RestConfiguration };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistryMock(catalogsMap);
  });

  beforeEach(() => {
    restConfigurationDef = {
      restConfiguration: {
        ...restConfigurationStub.restConfiguration,
      },
    };
  });

  describe('isApplicable', () => {
    it.each([
      [true, { restConfiguration: {} }],
      [true, { restConfiguration: { bindingMode: 'off' } }],
      [true, restConfigurationStub],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { restConfiguration: { bindingMode: 'off' }, anotherProperty: true }],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelRestConfigurationVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('function Object() { [native code] }', () => {
    it('should set id to generated id', () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

      expect(entity.id).toMatch(REST_CONFIGURATION_ID_REGEXP);
    });
  });

  it('should return id', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getId()).toMatch(REST_CONFIGURATION_ID_REGEXP);
  });

  it('should set id', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);
    const newId = 'newId';
    entity.setId(newId);

    expect(entity.getId()).toEqual(newId);
  });

  it('should return node label', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getNodeLabel()).toEqual('restConfiguration');
  });

  it('should return entity current definition', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getNodeDefinition()).toEqual(restConfigurationDef.restConfiguration);
  });

  it('should return schema from store', async () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(await entity.getNodeSchema()).toEqual(restConfigurationSchema);
  });

  describe('updateModel', () => {
    it('should update model', () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);
      const path = 'restConfiguration.bindingMode';
      const value = 'json';

      entity.updateModel(path, value);

      expect(restConfigurationDef.restConfiguration.bindingMode).toEqual(value);
    });

    it('should not update model if path is not defined', () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);
      const value = 'json_xml';

      entity.updateModel(undefined, value);

      expect(restConfigurationDef.restConfiguration.bindingMode).toEqual('off');
    });

    it('should reset the restConfiguration object if it is not defined', () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

      entity.updateModel('restConfiguration', {});

      expect(restConfigurationDef.restConfiguration).toEqual({});
    });
  });

  it('return no interactions', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getNodeInteraction()).toEqual({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: false,
    });
  });

  describe('getNodeValidationText', () => {
    it('should return undefined for valid definitions', async () => {
      const entity = new CamelRestConfigurationVisualEntity({
        restConfiguration: {
          ...restConfigurationDef.restConfiguration,
          useXForwardHeaders: true,
          apiVendorExtension: true,
          skipBindingOnErrorCode: true,
          clientRequestValidation: true,
          clientResponseValidation: true,
          enableCORS: true,
          enableNoContentResponse: true,
          inlineRoutes: true,
        },
      });

      expect(await entity.getNodeValidationText()).toBeUndefined();
    });

    it('should not modify the original definition when validating', async () => {
      const originalRestConfigurationDef: RestConfiguration = { ...restConfigurationDef.restConfiguration };
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

      await entity.getNodeValidationText();

      expect(restConfigurationDef.restConfiguration).toEqual(originalRestConfigurationDef);
    });

    it('should return errors when there is an invalid property', async () => {
      const invalidRestConfigurationDef: RestConfiguration = {
        ...restConfigurationDef.restConfiguration,
        useXForwardHeaders: 'true' as unknown as RestConfiguration['useXForwardHeaders'],
        apiVendorExtension: 'true' as unknown as RestConfiguration['apiVendorExtension'],
        skipBindingOnErrorCode: 'true' as unknown as RestConfiguration['skipBindingOnErrorCode'],
        clientRequestValidation: 'true' as unknown as RestConfiguration['clientRequestValidation'],
        clientResponseValidation: 'true' as unknown as RestConfiguration['clientResponseValidation'],
        enableCORS: 'true' as unknown as RestConfiguration['enableCORS'],
        enableNoContentResponse: 'true' as unknown as RestConfiguration['enableNoContentResponse'],
        inlineRoutes: 'true' as unknown as RestConfiguration['inlineRoutes'],
      };
      const entity = new CamelRestConfigurationVisualEntity({ restConfiguration: invalidRestConfigurationDef });

      expect(await entity.getNodeValidationText()).toEqual(`'/useXForwardHeaders' must be boolean,
'/apiVendorExtension' must be boolean,
'/skipBindingOnErrorCode' must be boolean,
'/clientRequestValidation' must be boolean,
'/clientResponseValidation' must be boolean,
'/enableCORS' must be boolean,
'/enableNoContentResponse' must be boolean,
'/inlineRoutes' must be boolean`);
    });
  });

  describe('toVizNode', () => {
    it('should return visualization node', async () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

      const vizNode = await entity.toVizNode();

      expect(vizNode.data).toEqual({
        entity,
        name: 'restConfiguration',
        isGroup: true,
        path: 'restConfiguration',
        processorName: 'restConfiguration',
        iconAlt: 'Entity icon',
        iconUrl: 'file-mock-data',
        isPlaceholder: false,
        title: 'Rest Configuration',
        description: 'restConfiguration: To configure rest',
        processorIconTooltip: '',
      });
    });

    it('should return schema title from enriched data', async () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);
      const vizNode = await entity.toVizNode();

      expect(vizNode.getNodeTitle()).toEqual('Rest Configuration');
    });
  });

  it('getCopiedContent should return the content to be copied', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getCopiedContent()).toEqual({
      type: SourceSchemaType.Route,
      name: 'restConfiguration',
      definition: restConfigurationDef.restConfiguration,
    });
  });

  it('should serialize the restConfiguration definition', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.toJSON()).toEqual(restConfigurationDef);
  });
});
