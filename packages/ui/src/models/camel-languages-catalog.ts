import { JSONSchemaType } from 'ajv';
import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';

export interface ICamelLanguageDefinition {
  model: ICamelLanguageModel;
  properties: Record<string, ICamelLanguageProperty>;
  propertiesSchema: JSONSchemaType<unknown>;
}

export interface ICamelLanguageModel extends ICamelProcessorModel {}

export interface ICamelLanguageProperty extends ICamelProcessorProperty {}
