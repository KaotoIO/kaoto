import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { SourceSchemaType } from '../../../camel/source-schema-type';
import { CatalogKind } from '../../../catalog-kind';

const TEMPLATE_ID_MAP: Partial<Record<SourceSchemaType, string>> = {
  [SourceSchemaType.RouteYaml]: 'camel-route-yaml',
  [SourceSchemaType.RouteXml]: 'camel-route-xml',
  [SourceSchemaType.Pipe]: 'pipe-yaml',
  [SourceSchemaType.Kamelet]: 'kamelet-source-yaml',
  [SourceSchemaType.Test]: 'citrus-yaml',
};

export class FlowTemplateService {
  static async getFlowSourceTemplate(type: SourceSchemaType): Promise<string> {
    const templateId = TEMPLATE_ID_MAP[type];
    if (!templateId) return '';

    const raw = await DynamicCatalogRegistry.get().getEntity(CatalogKind.StarterTemplate, templateId);
    if (!raw) return '';

    return raw.replace(/__KAOTO_ID__/g, () => getCamelRandomId('id'));
  }
}
