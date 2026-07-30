import { KaotoFunction, KaotoFunctionArgument } from '@kaoto/camel-catalog/types';

import { ICamelComponentDefinition } from '../models/camel/camel-components-catalog';
import { ICamelDataformatDefinition } from '../models/camel/camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../models/camel/camel-languages-catalog';
import { ICamelProcessorDefinition } from '../models/camel/camel-processors-catalog';
import { IKameletDefinition } from '../models/camel/kamelets-catalog';
import { CatalogKind } from '../models/catalog-kind';
import { ICitrusComponentDefinition } from '../models/citrus/citrus-catalog';

export type DynamicCatalogTypeMap = {
  [CatalogKind.Component]: ICamelComponentDefinition;
  [CatalogKind.Processor]: ICamelProcessorDefinition;
  [CatalogKind.Pattern]: ICamelProcessorDefinition;
  [CatalogKind.Entity]: ICamelProcessorDefinition;
  [CatalogKind.Language]: ICamelLanguageDefinition;
  [CatalogKind.Dataformat]: ICamelDataformatDefinition;
  [CatalogKind.Loadbalancer]: ICamelProcessorDefinition;
  [CatalogKind.Kamelet]: IKameletDefinition;
  [CatalogKind.TestAction]: ICitrusComponentDefinition;
  [CatalogKind.TestActionGroup]: ICitrusComponentDefinition;
  [CatalogKind.TestContainer]: ICitrusComponentDefinition;
  [CatalogKind.TestEndpoint]: ICitrusComponentDefinition;
  [CatalogKind.TestFunction]: ICitrusComponentDefinition;
  [CatalogKind.TestValidationMatcher]: ICitrusComponentDefinition;
  [CatalogKind.Function]: Record<string, KaotoFunction<KaotoFunctionArgument>>;
};

export interface ICatalogProvider<T> {
  readonly id: string;
  fetch(key: string): Promise<T | undefined>;
  fetchAll(): Promise<Record<string, T>>;
}

export interface IDynamicCatalog<T> {
  get(key: string, options?: { forceFresh?: boolean }): Promise<T | undefined>;
  getAll(options?: {
    forceFresh?: boolean;
    filterFn?: (key: string, entity: T) => boolean;
  }): Promise<Record<string, T> | undefined>;
  clearCache(): void;
}

export interface IDynamicCatalogRegistry {
  setCatalog<K extends CatalogKind>(kind: K, catalog: IDynamicCatalog<DynamicCatalogTypeMap[K]>): void;
  getCatalog<K extends CatalogKind>(kind: K): IDynamicCatalog<DynamicCatalogTypeMap[K]> | undefined;

  getEntity<K extends CatalogKind>(
    kind: K,
    key: string,
    options?: { forceFresh?: boolean },
  ): Promise<DynamicCatalogTypeMap[K] | undefined>;

  clearRegistry(): void;
}
