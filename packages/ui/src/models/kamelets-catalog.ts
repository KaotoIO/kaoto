import { CatalogKind } from './catalog-kind';

export interface IKameletDefinition {
  apiVersion: string;
  kind: CatalogKind.Kamelet;
  metadata: IKameletMetadata;
  spec: IKameletSpec;
}

export interface IKameletMetadata {
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
}

export interface IKameletMetadataLabels {
  'camel.apache.org/kamelet.type': string;
}

export interface IKameletSpec {
  definition: IKameletSpecDefinition;
  dependencies: string[];
  template: {
    beans: unknown;
    from: unknown;
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
