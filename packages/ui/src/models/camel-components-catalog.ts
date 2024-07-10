import { CamelPropertyCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICamelComponentDefinition {
  component: ICamelComponent;
  componentProperties: Record<string, ICamelComponentProperty>;
  properties: Record<string, ICamelComponentProperty>;
  propertiesSchema: KaotoSchemaDefinition['schema'];
  headers?: Record<string, ICamelComponentHeader>;
  apis?: Record<string, ICamelComponentApi>;
  apiProperties?: Record<string, ICamelComponentApiProperty>;
}

export interface ICamelComponent {
  kind: CatalogKind.Component;
  name: string;
  title: string;
  description?: string;
  deprecated: boolean;
  firstVersion?: string;
  label: string;
  javaType?: string;
  supportLevel?: string;
  groupId?: string;
  artifactId?: string;
  version: string;
  scheme?: string;
  extendsScheme?: string;
  syntax?: string;
  async?: boolean;
  api?: boolean;
  consumerOnly?: boolean;
  producerOnly?: boolean;
  lenientProperties?: boolean;
  provider?: string;
}

// these interfaces don't contain all properties which are save in the component json object. If you need some new, add it here
export interface ICamelComponentProperty extends CamelPropertyCommon {
  group: string;
  type: string;
}

export interface ICamelComponentHeader extends CamelPropertyCommon {
  group: string;
  constantName: string;
}

// e.g. for as2/twilio component
export interface ICamelComponentApi {
  consumerOnly: boolean;
  producerOnly: boolean;
  description: string;
  methods: Record<string, ICamelComponentApiMethod>;
}

export interface ICamelComponentApiMethod {
  description: string;
  signatures: string[];
}

export interface ICamelComponentApiProperty {
  methods: Record<string, ICamelComponentApiPropertyMethod>;
}

export interface ICamelComponentApiPropertyMethod {
  properties: Record<string, ICamelComponentProperty>; // api.method.property is same as camelcomponentproperty
}

export enum ICamelComponentApiKind {
  API = 'Api',
  METHOD = 'Method',
  PARAM = 'Param',
}
