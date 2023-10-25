import { SourceSchemaType } from '../../camel/source-schema-type';
import { parse } from 'yaml';

export class FlowTemplateService {
  getFlowTemplate = (type: SourceSchemaType) => {
    return parse(this.getFlowYamlTemplate(type));
  };

  getFlowYamlTemplate = (type: SourceSchemaType): string => {
    switch (type) {
      case SourceSchemaType.Pipe:
        return `apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: webhook-binding
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: timer-source
  sink:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: log-sink`;
        break;
      case SourceSchemaType.Route:
        return `- route:
    from:
      uri: timer:template
      steps:
        - to:
            uri: log:template`;
      default:
        return '';
    }
  };
}
export const flowTemplateService = new FlowTemplateService();
