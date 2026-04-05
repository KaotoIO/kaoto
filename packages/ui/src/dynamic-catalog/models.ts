import { KaotoFunction } from '@kaoto/camel-catalog/types';

import {
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';
import { CatalogKind } from '../models/catalog-kind';

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
  [CatalogKind.Function]: Record<string, KaotoFunction>;
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
