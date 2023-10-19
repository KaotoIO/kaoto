import { ICamelComponentDefinition } from './camel-components-catalog';
import { ICamelProcessorDefinition } from './camel-processors-catalog';
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
}

export interface CatalogEntry {
  name: string;
  version: string;
  file: string;
}

export interface SchemaEntry extends CatalogEntry {
  description: string;
}

export type CatalogTypes = Record<string, ICamelComponentDefinition | ICamelProcessorDefinition | IKameletDefinition>;

export interface ComponentsCatalog {
  [CatalogKind.Component]?: Record<string, ICamelComponentDefinition>;
  [CatalogKind.Processor]?: Record<string, ICamelProcessorDefinition>;
  [CatalogKind.Kamelet]?: Record<string, IKameletDefinition>;
}
