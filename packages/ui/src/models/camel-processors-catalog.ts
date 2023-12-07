import { CamelPropertyCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';
import { JSONSchemaType } from 'ajv';

export interface ICamelProcessorDefinition {
  model: ICamelProcessorModel;
  properties: Record<string, ICamelProcessorProperty>;
  propertiesSchema?: JSONSchemaType<unknown>;
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

export interface ICamelProcessorProperty extends CamelPropertyCommon {
  oneOf?: string[];
  type: string;
}
