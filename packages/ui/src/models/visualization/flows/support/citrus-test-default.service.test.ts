import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCitrusCatalogMap } from '../../../../stubs/test-load-catalog';
import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { ICitrusTestActionTemplateDefinition } from '../../../citrus/citrus-catalog';
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
    const template: ICitrusTestActionTemplateDefinition = {
      kind: CatalogKind.TestActionTemplate,
      name: 'prepare-order',
      title: 'Prepare order',
      parameters: [{ name: 'region', value: '${region}' }],
    };

    it('inserts a standard template call with the declared parameters', () => {
      const result = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: CatalogKind.TestActionTemplate,
        name: template.name,
        definition: template,
      });

      expect(result).toEqual({
        applyTemplate: { name: 'prepare-order', parameters: [{ name: 'region', value: '${region}' }] },
      });
    });

    it('keeps inserted parameters independent of the catalog and other calls', () => {
      const component: DefinedComponent = {
        type: CatalogKind.TestActionTemplate,
        name: template.name,
        definition: template,
      };
      const first = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(component);
      const second = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(component);
      const firstCall = first.applyTemplate as {
        parameters: NonNullable<ICitrusTestActionTemplateDefinition['parameters']>;
      };
      firstCall.parameters[0].value = 'eu';
      firstCall.parameters.push({ name: 'extra', value: 'added' });

      expect(second.applyTemplate).toEqual({ name: template.name, parameters: template.parameters });
      expect(template.parameters).toEqual([{ name: 'region', value: '${region}' }]);
    });

    it('resolves templates separately from test actions with the same name', () => {
      expect(
        CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
          type: CatalogKind.TestActionTemplate,
          name: 'echo',
          definition: { ...template, name: 'echo' },
        }),
      ).toEqual({ applyTemplate: { name: 'echo', parameters: template.parameters } });
      expect(
        CitrusTestDefaultService.getDefaultTestActionDefinitionValue({ type: CatalogKind.TestAction, name: 'echo' }),
      ).toEqual({ echo: {} });
    });

    it.each([undefined, []])('omits parameters when the template declares none: %s', (parameters) => {
      expect(
        CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
          type: CatalogKind.TestActionTemplate,
          name: template.name,
          definition: { ...template, parameters } as ICitrusTestActionTemplateDefinition,
        }),
      ).toEqual({ applyTemplate: { name: template.name } });
    });

    it('preserves scalar parameter values and their order', () => {
      const parameters = [0, 42, true, false, null, '${region}'].map((value, index) => ({
        name: `parameter-${index}`,
        value,
      }));
      expect(
        CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
          type: CatalogKind.TestActionTemplate,
          name: template.name,
          definition: { ...template, parameters },
        }),
      ).toEqual({ applyTemplate: { name: template.name, parameters } });
    });

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
