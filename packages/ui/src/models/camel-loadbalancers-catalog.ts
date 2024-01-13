import { JSONSchemaType } from 'ajv';
import { ICamelProcessorModel, ICamelProcessorProperty } from './camel-processors-catalog';

export interface ICamelLoadBalancerDefinition {
  model: ICamelLoadBalancerModel;
  properties: Record<string, ICamelLoadBalancerProperty>;
  propertiesSchema: JSONSchemaType<unknown>;
}

export interface ICamelLoadBalancerModel extends ICamelProcessorModel {}

export interface ICamelLoadBalancerProperty extends ICamelProcessorProperty {}
