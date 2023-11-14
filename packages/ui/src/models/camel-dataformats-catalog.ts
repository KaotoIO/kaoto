import { JSONSchemaType } from 'ajv';
import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';

export interface ICamelDataformatDefinition {
  model: ICamelDataformatModel;
  properties: Record<string, ICamelDataformatProperty>;
  propertiesSchema: JSONSchemaType<unknown>;
}

export interface ICamelDataformatModel extends ICamelProcessorModel {}

export interface ICamelDataformatProperty extends ICamelProcessorProperty {}
