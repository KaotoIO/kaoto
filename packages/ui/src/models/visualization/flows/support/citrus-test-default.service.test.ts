import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCitrusCatalogMap } from '../../../../stubs/test-load-catalog';
import { DefinedComponent } from '../../../camel/camel-catalog-index';
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
    const createCatalogPresetFixture = () => {
      const catalogDefaultValue = {
        applyTemplate: {
          name: 'company-login',
          parameters: [
            {
              name: 'username',
              value: '${username}',
            },
          ],
        },
      };

      const definedComponent: DefinedComponent = {
        name: 'company-login',
        type: CatalogKind.TestAction,
        definition: {
          kind: CatalogKind.TestAction,
          name: 'company-login',
          defaultValue: catalogDefaultValue,
        },
      };

      return { catalogDefaultValue, definedComponent };
    };

    it('should return the default value for a print action', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'print',
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.print).toBeDefined();
    });

    it('should return the complete catalog-defined default value', () => {
      const { catalogDefaultValue, definedComponent } = createCatalogPresetFixture();

      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(definedComponent);

      expect(definitionValue).toStrictEqual(catalogDefaultValue);
    });

    it('should return deeply independent copies of a catalog-defined default value', () => {
      const { catalogDefaultValue, definedComponent } = createCatalogPresetFixture();

      const firstDefinitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(
        definedComponent,
      ) as typeof catalogDefaultValue;

      const secondDefinitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(
        definedComponent,
      ) as typeof catalogDefaultValue;

      expect(firstDefinitionValue).toStrictEqual(catalogDefaultValue);
      expect(secondDefinitionValue).toStrictEqual(catalogDefaultValue);

      expect(firstDefinitionValue).not.toBe(catalogDefaultValue);
      expect(secondDefinitionValue).not.toBe(catalogDefaultValue);
      expect(firstDefinitionValue).not.toBe(secondDefinitionValue);

      expect(firstDefinitionValue.applyTemplate).not.toBe(catalogDefaultValue.applyTemplate);
      expect(secondDefinitionValue.applyTemplate).not.toBe(catalogDefaultValue.applyTemplate);
      expect(firstDefinitionValue.applyTemplate).not.toBe(secondDefinitionValue.applyTemplate);

      expect(firstDefinitionValue.applyTemplate.parameters).not.toBe(
        catalogDefaultValue.applyTemplate.parameters,
      );
      expect(firstDefinitionValue.applyTemplate.parameters).not.toBe(
        secondDefinitionValue.applyTemplate.parameters,
      );

      expect(firstDefinitionValue.applyTemplate.parameters[0]).not.toBe(
        catalogDefaultValue.applyTemplate.parameters[0],
      );
      expect(firstDefinitionValue.applyTemplate.parameters[0]).not.toBe(
        secondDefinitionValue.applyTemplate.parameters[0],
      );

      firstDefinitionValue.applyTemplate.parameters[0].value = 'changed';

      expect(firstDefinitionValue.applyTemplate.parameters[0].value).toBe('changed');
      expect(secondDefinitionValue.applyTemplate.parameters[0].value).toBe('${username}');
      expect(catalogDefaultValue.applyTemplate.parameters[0].value).toBe('${username}');
    });

    it('should return the default value for a custom action', () => {
      const definitionValue = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: 'testAction',
        name: 'custom',
      } as DefinedComponent);

      expect(definitionValue).toStrictEqual({
        custom: {},
      });
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
