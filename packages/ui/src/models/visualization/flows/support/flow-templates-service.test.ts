import { SourceSchemaType } from '../../../camel/source-schema-type';
import { FlowTemplateService } from './flow-templates-service';

describe('FlowTemplateService', () => {
  describe('getFlowSourceTemplate', () => {
    it('returns an XML string containing <routes> for RouteXml', () => {
      const result = FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteXml);
      expect(typeof result).toBe('string');
      expect(result).toContain('<routes');
      expect(result).not.toContain('route:');
    });

    it('returns a YAML string for Route', () => {
      const result = FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteYaml);
      expect(result).toContain('route:');
      expect(result).not.toContain('<routes');
    });

    it('returns empty string for unknown types', () => {
      const result = FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.Integration);
      expect(result).toBe('');
    });
  });
});
