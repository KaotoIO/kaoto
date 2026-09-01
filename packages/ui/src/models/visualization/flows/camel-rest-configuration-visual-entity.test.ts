import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RestConfiguration } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { restConfigurationSchema, restConfigurationStub } from '../../../stubs/rest-configuration';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRestConfigurationVisualEntity } from './camel-rest-configuration-visual-entity';

describe('CamelRestConfigurationVisualEntity', () => {
  const REST_CONFIGURATION_ID_REGEXP = /^restConfiguration-[a-zA-Z0-9]{4}$/;
  let restConfigurationDef: { restConfiguration: RestConfiguration };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
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

  it('should return entity current definition', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.getNodeDefinition()).toEqual(restConfigurationDef.restConfiguration);
  });

  it('should return schema from catalog', async () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    const result = await entity.fetchNodeSchema({
      primaryNodeId: { name: 'restConfiguration', catalogKind: CatalogKind.Entity },
    });

    expect(result).toEqual(restConfigurationSchema);
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

      expect(restConfigurationDef.restConfiguration.bindingMode).toBe('off');
    });

    it('should reset the restConfiguration object if it is not defined', () => {
      const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

      entity.updateModel('restConfiguration', {});

      expect(restConfigurationDef.restConfiguration).toEqual({});
    });
  });

  it('should serialize the restConfiguration definition', () => {
    const entity = new CamelRestConfigurationVisualEntity(restConfigurationDef);

    expect(entity.toJSON()).toEqual(restConfigurationDef);
  });
});
