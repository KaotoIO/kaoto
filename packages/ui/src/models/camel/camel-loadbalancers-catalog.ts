import { KaotoSchemaDefinition } from '../kaoto-schema';
import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';

export interface ICamelLoadBalancerDefinition {
  model: ICamelLoadBalancerModel;
  properties: Record<string, ICamelLoadBalancerProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
}

export type ICamelLoadBalancerModel = ICamelProcessorModel;

export type ICamelLoadBalancerProperty = ICamelProcessorProperty;
