import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelDataformatDefinition {
  model: ICamelDataformatModel;
  properties: Record<string, ICamelDataformatProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export interface ICamelDataformatModel extends ICamelProcessorModel {}

export interface ICamelDataformatProperty extends ICamelProcessorProperty {}
