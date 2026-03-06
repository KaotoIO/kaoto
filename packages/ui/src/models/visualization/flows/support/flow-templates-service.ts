import { parse } from 'yaml';

import { SourceSchemaType } from '../../../camel/source-schema-type';
import { testTemplate } from '../templates/citrus';
import { kameletTemplate } from '../templates/kamelet';
import { pipeTemplate } from '../templates/pipe';
import { routeTemplate } from '../templates/route';

export class FlowTemplateService {
  static getFlowTemplate = (type: SourceSchemaType) => {
    return parse(this.getFlowYamlTemplate(type));
  };

  static getFlowYamlTemplate = (type: SourceSchemaType): string => {
    switch (type) {
      case SourceSchemaType.Pipe:
        return pipeTemplate();

      case SourceSchemaType.Route:
        return routeTemplate();

      case SourceSchemaType.Test:
        return testTemplate();

      case SourceSchemaType.Kamelet:
        return kameletTemplate();

      default:
        return '';
    }
  };
}
