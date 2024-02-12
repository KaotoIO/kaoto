import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelLanguageDefinition {
  model: ICamelLanguageModel;
  properties: Record<string, ICamelLanguageProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export interface ICamelLanguageModel extends ICamelProcessorModel {}

export interface ICamelLanguageProperty extends ICamelProcessorProperty {}
