import { CatalogKind } from './catalog-kind';

export interface ICamelProcessorDefinition {
  model: ICamelProcessorModel;
  properties: {
    [K in string]: ICamelProcessorProperties;
  };
}

export interface ICamelProcessorModel {
  kind: CatalogKind.Processor;
  name: string;
  title: string;
  description?: string;
  deprecated: boolean;
  label: string;
  javaType?: string;
  abstract?: boolean;
  input?: boolean;
  output?: boolean;
}

export interface ICamelProcessorProperties {
  index: number;
  kind: string;
  displayName: string;
  required: boolean;
  type: string;
  javaType: string;
  oneOf: string[];
  deprecated: boolean;
  autowired: boolean;
  secret: boolean;
  description: string;
}
