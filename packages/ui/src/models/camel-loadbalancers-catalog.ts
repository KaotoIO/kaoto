import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelLoadBalancerDefinition {
  model: ICamelLoadBalancerModel;
  properties: Record<string, ICamelLoadBalancerProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export interface ICamelLoadBalancerModel extends ICamelProcessorModel {}

export interface ICamelLoadBalancerProperty extends ICamelProcessorProperty {}
