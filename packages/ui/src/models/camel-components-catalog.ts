import { CatalogKind } from './catalog-kind';

export interface ICamelComponentDefinition {
  component: ICamelComponent;
  componentProperties: ICamelComponentProperties;
  headers: ICamelComponentHeaders;
  properties: ICamelComponentProperties;
}

export interface ICamelComponent {
  kind: CatalogKind.Component;
  name: string;
  title: string;
  description: string;
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
}

export interface CatalogItemCommon {
  index: number;
  kind: string;
  displayName: string;
  group: string;
  label: string;
  required: boolean;
  javaType: string;
  deprecated: boolean;
  deprecationNote: string;
  autowired: boolean;
  secret: boolean;
  description: string;
}

export interface ICamelComponentProperties {
  type: string;
}

export interface ICamelComponentHeaders extends CatalogItemCommon {
  constantName: string;
}
