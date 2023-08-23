import { CamelPropertiesCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';

export interface ICamelProcessorDefinition {
  model: ICamelProcessorModel;
  properties: Record<string, ICamelProcessorProperties>;
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

export interface ICamelProcessorProperties extends CamelPropertiesCommon {
  oneOf?: string[];
}
