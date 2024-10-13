import { parse } from 'yaml';
import { SourceSchemaType } from '../../../camel/source-schema-type';
import { kameletTemplate } from '../templates/kamelet';
import { pipeTemplate } from '../templates/pipe';
import { routeTemplate } from '../templates/route';
import { restTemplate } from '../templates/rest';

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

      case SourceSchemaType.Kamelet:
        return kameletTemplate();

      case SourceSchemaType.Rest:
        return restTemplate();

      default:
        return '';
    }
  };
}
