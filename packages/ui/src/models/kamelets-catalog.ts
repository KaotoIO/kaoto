import { FromDefinition, Kamelet, ObjectMeta, RouteTemplateBeanDefinition } from '@kaoto-next/camel-catalog/types';
import { SourceSchemaType } from './camel/source-schema-type';
import { KaotoSchemaDefinition } from './kaoto-schema';

export const enum KameletKnownAnnotations {
  Icon = 'camel.apache.org/kamelet.icon',
  SupportLevel = 'camel.apache.org/kamelet.support.level',
  CatalogVersion = 'camel.apache.org/catalog.version',
  Provider = 'camel.apache.org/provider',
  Group = 'camel.apache.org/kamelet.group',
  Namespace = 'camel.apache.org/kamelet.namespace',
}

export const enum KameletKnownLabels {
  Type = 'camel.apache.org/kamelet.type',
}

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
  [KameletKnownAnnotations.SupportLevel]: string;
  [KameletKnownAnnotations.CatalogVersion]: string;
  [KameletKnownAnnotations.Icon]: string;
  [KameletKnownAnnotations.Provider]: string;
  [KameletKnownAnnotations.Group]: string;
  [KameletKnownAnnotations.Namespace]: string;
  [k: string]: string;
}

export interface IKameletMetadataLabels {
  [KameletKnownLabels.Type]: string;
  [k: string]: string;
}

export interface IKameletSpec {
  definition: IKameletSpecDefinition;
  dependencies: string[];
  template: {
    beans?: RouteTemplateBeanDefinition[];
    from: FromDefinition;
  };
  types?: {
    in?: {
      mediaType: string;
    };
    out?: {
      mediaType: string;
    };
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
}

export interface IKameletSpecProperty {
  title: string;
  description: string;
  type: string;
  default?: string | boolean | number;
  example?: string;
  'x-descriptors'?: string[];
}

export interface IKameletCustomProperty extends IKameletSpecProperty {
  name: string;
}

export interface IKameletCustomDefinition {
  name: string;
  title: string;
  description: string;
  type: string;
  icon: string;
  supportLevel: string;
  catalogVersion: string;
  provider: string;
  group: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  kameletProperties: IKameletCustomProperty[];
}
