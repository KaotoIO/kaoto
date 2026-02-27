import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCitrusCatalogMap } from '../../../../stubs/test-load-catalog';
import { DefinedComponent } from '../../../camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CitrusTestDefaultService } from './citrus-test-default.service';

describe('CitrusTestDefaultService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestAction, catalogsMap.actionsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, catalogsMap.containersCatalogMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getDefaultTestActionDefinitionValue', () => {
    it('should return the default value for a print action', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'print',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.print).toBeDefined();
    });

    it('should return the default value for a custom action', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'custom',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      const json = definitionValue as Record<string, unknown>;
      expect(json.custom).toBeDefined();
    });

    it('should return the default iterate container', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testContainer',
        name: 'iterate',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.iterate).toBeDefined();
    });

    it('should return the default value for a createVariables action', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'createVariables',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.createVariables).toBeDefined();
    });

    it('should return the default value for an action with a test group', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'kubernetes-createService',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.kubernetes).toBeDefined();
      const json = definitionValue.kubernetes as Record<string, unknown>;
      expect(json.createService).toBeDefined();
    });

    it('should return the default value for an action with multiple test groups', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'camel-jbang-run',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.camel).toBeDefined();
      const json = definitionValue.camel as Record<string, Record<string, unknown>>;
      expect(json.jbang).toBeDefined();
      expect(json.jbang.run).toBeDefined();
    });
  });
});
