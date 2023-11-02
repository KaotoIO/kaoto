import { CamelPropertyCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';

export interface ICamelDataformatDefinition {
  model: ICamelDataformatModel;
  properties: Record<string, ICamelDataformatProperty>;
}

export interface ICamelDataformatModel {
  kind: CatalogKind.Dataformat;
  name: string;
  title: string;
  description?: string;
  deprecated: boolean;
  label: string;
  javaType?: string;
  abstract?: boolean;
  input?: boolean;
  output?: boolean;
}

export interface ICamelDataformatProperty extends CamelPropertyCommon {
  oneOf?: string[];
  type: string;
}
