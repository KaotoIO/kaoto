import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelLanguageDefinition {
  model: ICamelLanguageModel;
  properties: Record<string, ICamelLanguageProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export type ICamelLanguageModel = ICamelProcessorModel;

export type ICamelLanguageProperty = ICamelProcessorProperty;
