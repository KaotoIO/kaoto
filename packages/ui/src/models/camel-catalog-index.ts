import { ICamelComponentDefinition } from './camel-components-catalog';
import { ICamelProcessorDefinition } from './camel-processors-catalog';
import { ICamelLanguageDefinition } from './camel-languages-catalog';
import { ICamelDataformatDefinition } from './camel-dataformats-catalog';
import { CatalogKind } from './catalog-kind';
import { IKameletDefinition } from './kamelets-catalog';

export interface CamelCatalogIndex {
  catalogs: Catalogs;
  schemas: Record<string, SchemaEntry>;
}

export interface Catalogs {
  models: CatalogEntry;
  components: CatalogEntry;
  languages: CatalogEntry;
  dataformats: CatalogEntry;
  kamelets: CatalogEntry;
  kameletBoundaries: CatalogEntry;
  patterns: CatalogEntry;
}

export interface CatalogEntry {
  name: string;
  version: string;
  file: string;
}

export interface SchemaEntry extends CatalogEntry {
  description: string;
}

export type ComponentsCatalogTypes =
  | ICamelComponentDefinition
  | ICamelProcessorDefinition
  | ICamelLanguageDefinition
  | ICamelDataformatDefinition
  | IKameletDefinition;
export type DefinedComponent = {
  name: string;
  type: CatalogKind;
  definition?: ComponentsCatalogTypes;
  defaultValue?: object;
};

export interface ComponentsCatalog {
  [CatalogKind.Component]?: Record<string, ICamelComponentDefinition>;
  [CatalogKind.Processor]?: Record<string, ICamelProcessorDefinition>;
  [CatalogKind.Pattern]?: Record<string, ICamelProcessorDefinition>;
  [CatalogKind.Language]?: Record<string, ICamelLanguageDefinition>;
  [CatalogKind.Dataformat]?: Record<string, ICamelDataformatDefinition>;
  [CatalogKind.Kamelet]?: Record<string, IKameletDefinition>;
  [CatalogKind.KameletBoundary]?: Record<string, IKameletDefinition>;
}
