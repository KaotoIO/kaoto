import { parse } from 'yaml';

import { SourceSchemaType } from '../../../camel/source-schema-type';
import { testTemplate } from '../templates/citrus';
import { kameletTemplate } from '../templates/kamelet';
import { pipeTemplate } from '../templates/pipe';
import { routeTemplate } from '../templates/route';
import { routeXmlTemplate } from '../templates/route-xml';

export class FlowTemplateService {
  static readonly getFlowTemplate = (type: SourceSchemaType) => {
    if (type === SourceSchemaType.RouteXml) {
      return this.getFlowSourceTemplate(type);
    }
    return parse(this.getFlowSourceTemplate(type));
  };

  static readonly getFlowSourceTemplate = (type: SourceSchemaType): string => {
    switch (type) {
      case SourceSchemaType.Pipe:
        return pipeTemplate();

      case SourceSchemaType.Route:
        return routeTemplate();

      case SourceSchemaType.RouteXml:
        return routeXmlTemplate();

      case SourceSchemaType.Test:
        return testTemplate();

      case SourceSchemaType.Kamelet:
        return kameletTemplate();

      default:
        return '';
    }
  };
}
