import { CamelPropertyCommon } from './camel-properties-common';
import { CatalogKind } from './catalog-kind';

export interface ICamelLanguageDefinition {
  language: ICamelLanguageModel;
  properties: Record<string, ICamelLanguageProperty>;
}

export interface ICamelLanguageModel {
  kind: CatalogKind.Language;
  name: string;
  title: string;
  description?: string;
  deprecated: boolean;
  firstVersion: string;
  label: string;
  javaType?: string;
  supportLelvel: string;
  groupId: string;
  artifactId: string;
  version: string;
  modelName: string;
  modelJavaType: string;
}

export interface ICamelLanguageProperty extends CamelPropertyCommon {
  type: string;
  title: string;
}
