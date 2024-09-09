import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelDataformatDefinition {
  model: ICamelDataformatModel;
  properties: Record<string, ICamelDataformatProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export type ICamelDataformatModel = ICamelProcessorModel;

export type ICamelDataformatProperty = ICamelProcessorProperty;
