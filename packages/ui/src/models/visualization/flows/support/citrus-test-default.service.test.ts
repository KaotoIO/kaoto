import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { CitrusTestDefaultService } from './citrus-test-default.service';

describe('CitrusTestDefaultService', () => {
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
