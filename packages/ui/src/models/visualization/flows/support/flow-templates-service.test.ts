import { DynamicCatalog } from '../../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { StarterTemplatesProvider } from '../../../../dynamic-catalog/providers/starter-templates.provider';
import { CatalogKind } from '../../../../models/catalog-kind';
import { SourceSchemaType } from '../../../camel/source-schema-type';
import { FlowTemplateService } from './flow-templates-service';

const TEMPLATES: Record<string, string> = {
  'camel-route-yaml': '- route:\n    id: route-__KAOTO_ID__',
  'camel-route-xml': '<routes><route id="route-__KAOTO_ID__"/></routes>',
  'pipe-yaml': 'kind: Pipe\nmetadata:\n  name: pipe-__KAOTO_ID__',
  'kamelet-source-yaml': 'kind: Kamelet\nmetadata:\n  name: kamelet-source-__KAOTO_ID__',
  'citrus-yaml': 'name: test-__KAOTO_ID__',
};

describe('FlowTemplateService', () => {
  beforeEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.StarterTemplate,
      new DynamicCatalog(new StarterTemplatesProvider(TEMPLATES)),
    );
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  describe('getFlowSourceTemplate', () => {
    it.each([
      [SourceSchemaType.RouteYaml, 'route-'],
      [SourceSchemaType.RouteXml, 'route-'],
      [SourceSchemaType.Pipe, 'pipe-'],
      [SourceSchemaType.Kamelet, 'kamelet-source-'],
      [SourceSchemaType.Test, 'test-'],
    ])('resolves %s to a non-empty string containing the expected prefix', async (type, prefix) => {
      const result = await FlowTemplateService.getFlowSourceTemplate(type);
      expect(result).toBeTruthy();
      expect(result).toContain(prefix);
    });

    it('replaces __KAOTO_ID__ so none remain in the output', async () => {
      const result = await FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteYaml);
      expect(result).not.toContain('__KAOTO_ID__');
    });

    it('produces a distinct ID on each call', async () => {
      const a = await FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteYaml);
      const b = await FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteYaml);
      // Templates produce e.g. "route-id-1234"; extract the numeric suffix for comparison
      const idA = a.match(/id-(\d+)/)?.[1];
      const idB = b.match(/id-(\d+)/)?.[1];
      expect(idA).toBeDefined();
      expect(idB).toBeDefined();
      expect(idA).not.toBe(idB);
    });

    it('returns empty string for unsupported types', async () => {
      const result = await FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.Integration);
      expect(result).toBe('');
    });

    it('returns empty string when registry has no StarterTemplate catalog', async () => {
      DynamicCatalogRegistry.get().clearRegistry();
      const result = await FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.RouteYaml);
      expect(result).toBe('');
    });
  });
});
