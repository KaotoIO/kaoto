import { CamelPropertiesCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';

export interface ICamelComponentDefinition {
  component: ICamelComponent;
  componentProperties: Record<string, ICamelComponentProperties>;
  headers: Record<string, ICamelComponentHeaders>;
  properties: Record<string, ICamelComponentProperties>;
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
}


// these interfaces don't contain all properties which are save in the component json object. If you need some new, add it here
export interface ICamelComponentProperties extends CamelPropertiesCommon{
  type: string;
}

export interface ICamelComponentHeaders extends CamelPropertiesCommon {
  constantName: string;
}
