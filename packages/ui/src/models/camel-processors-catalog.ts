import { CamelPropertyCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelProcessorDefinition {
  model: ICamelProcessorModel;
  properties: Record<string, ICamelProcessorProperty>;
  propertiesSchema?: KaotoSchemaDefinition['schema'];
}

export interface ICamelProcessorModel {
  kind: CatalogKind.Processor;
  name: string;
  title: string;
  description?: string;
  deprecated: boolean;
  label: string;
  supportLevel?: string;
  javaType?: string;
  abstract?: boolean;
  input?: boolean;
  output?: boolean;
  provider?: string;
}

export interface ICamelProcessorProperty extends CamelPropertyCommon {
  oneOf?: string[];
  type: string;
}
