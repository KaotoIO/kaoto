import { FromDefinition, Kamelet, ObjectMeta, RouteTemplateBeanDefinition } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './camel/source-schema-type';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface IKameletDefinition extends Omit<Kamelet, 'kind' | 'metadata' | 'spec'> {
  kind: SourceSchemaType.Kamelet;
  metadata: IKameletMetadata;
  spec: IKameletSpec;
  propertiesSchema?: KaotoSchemaDefinition['schema'];
}

export interface IKameletMetadata extends ObjectMeta {
  name: string;
  annotations: IKameletMetadataAnnotations;
  labels: IKameletMetadataLabels;
}

export interface IKameletMetadataAnnotations {
  'camel.apache.org/kamelet.support.level': string;
  'camel.apache.org/catalog.version': string;
  'camel.apache.org/kamelet.icon': string;
  'camel.apache.org/provider': string;
  'camel.apache.org/kamelet.group': string;
  'camel.apache.org/kamelet.namespace': string;
  [k: string]: string;
}

export interface IKameletMetadataLabels {
  'camel.apache.org/kamelet.type': string;
  [k: string]: string;
}

export interface IKameletSpec {
  definition: IKameletSpecDefinition;
  dependencies: string[];
  template: {
    beans?: RouteTemplateBeanDefinition[];
    from: FromDefinition;
  };
}

export interface IKameletSpecDefinition {
  title: string;
  description?: string;
  type: string;
  required?: string[];
  properties?: Record<string, IKameletSpecProperty>;
  example?: string;
  default?: unknown;
  'x-descriptors'?: string[];
}

export interface IKameletSpecProperty {
  title: string;
  description: string;
  type: string;
  default?: string | boolean | number;
  example?: string;
}
