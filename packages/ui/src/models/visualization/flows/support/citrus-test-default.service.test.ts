import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { ICitrusTestActionTemplateDefinition } from '../../../citrus/citrus-catalog';
import { CitrusTestDefaultService } from './citrus-test-default.service';

describe('CitrusTestDefaultService', () => {
  describe('getDefaultTestActionDefinitionValue', () => {
    const template: ICitrusTestActionTemplateDefinition = {
      kind: CatalogKind.TestActionTemplate,
      name: 'prepare-order',
      title: 'Prepare order',
      parameters: [{ name: 'region', value: '${region}' }],
    };

    it('prefers and clones a complete value supplied on the selected component', () => {
      const defaultValue = { applyTemplate: { name: 'top-level', parameters: [{ name: 'mode', value: 'fast' }] } };
      const result = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: CatalogKind.TestAction,
        name: 'company-login',
        defaultValue,
        definition: {
          kind: CatalogKind.TestAction,
          name: 'company-login',
          defaultValue: { applyTemplate: { name: 'definition' } },
        },
      }) as typeof defaultValue;

      expect(result).toEqual(defaultValue);
      expect(result).not.toBe(defaultValue);
      expect(result.applyTemplate).not.toBe(defaultValue.applyTemplate);
      expect(result.applyTemplate.parameters[0]).not.toBe(defaultValue.applyTemplate.parameters[0]);
    });

    it('inserts the complete catalog value and deep-clones it for each selection', () => {
      const defaultValue = {
        applyTemplate: {
          name: 'company-login',
          parameters: [{ name: 'username', value: '${username}' }],
        },
      };
      const component: DefinedComponent = {
        type: CatalogKind.TestAction,
        name: 'company-login',
        definition: { kind: CatalogKind.TestAction, name: 'company-login', defaultValue },
      };

      const first = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(component) as typeof defaultValue;
      const second = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(component) as typeof defaultValue;

      expect(first).toEqual(defaultValue);
      expect(second).toEqual(defaultValue);
      expect(first).not.toBe(defaultValue);
      expect(first.applyTemplate).not.toBe(defaultValue.applyTemplate);
      expect(first.applyTemplate.parameters).not.toBe(defaultValue.applyTemplate.parameters);
      expect(first.applyTemplate.parameters[0]).not.toBe(defaultValue.applyTemplate.parameters[0]);

      first.applyTemplate.parameters[0].value = 'changed';
      expect(second.applyTemplate.parameters[0].value).toBe('${username}');
      expect(defaultValue.applyTemplate.parameters[0].value).toBe('${username}');
    });

    it('inserts a catalog default value for a container', () => {
      const defaultValue = { sequential: { actions: [{ print: { message: 'ready' } }] } };
      const result = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: CatalogKind.TestContainer,
        name: 'custom-sequence',
        definition: { kind: CatalogKind.TestContainer, name: 'custom-sequence', defaultValue },
      });

      expect(result).toEqual(defaultValue);
    });

    it('uses an explicit template default value before generating an applyTemplate call', () => {
      const defaultValue = {
        applyTemplate: { name: 'alternate-template', parameters: [{ name: 'mode', value: 'fast' }] },
      };
      const result = CitrusTestDefaultService.getDefaultTestActionDefinitionValue({
        type: CatalogKind.TestActionTemplate,
        name: template.name,
        definition: { ...template, defaultValue },
      });

      expect(result).toEqual(defaultValue);
    });

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
      expect(definitionValue).toEqual({ custom: {} });
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
        definition: { group: 'kubernetes' },
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
        definition: { group: 'camel-jbang' },
      } as DefinedComponent);
      expect(definitionValue).toBeDefined();
      expect(definitionValue.camel).toBeDefined();
      const json = definitionValue.camel as Record<string, Record<string, unknown>>;
      expect(json.jbang).toBeDefined();
      expect(json.jbang.run).toBeDefined();
    });
  });
});
