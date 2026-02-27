import { CatalogDefinition, CatalogDefinitionEntry, KaotoFunction } from '@kaoto/camel-catalog/types';

import { ICamelComponentDefinition } from './camel-components-catalog';
import { ICamelDataformatDefinition } from './camel-dataformats-catalog';
import { ICamelLanguageDefinition } from './camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from './camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from './camel-processors-catalog';
import { CatalogKind } from './catalog-kind';
import { ICitrusComponentDefinition } from './citrus-catalog';
import { IKameletDefinition } from './kamelets-catalog';

export interface CamelCatalogIndex extends Omit<CatalogDefinition, 'catalogs'> {
  catalogs: {
    models: CatalogDefinitionEntry;
    components: CatalogDefinitionEntry;
    languages: CatalogDefinitionEntry;
    dataformats: CatalogDefinitionEntry;
    kamelets: CatalogDefinitionEntry;
    kameletBoundaries: CatalogDefinitionEntry;
    patterns: CatalogDefinitionEntry;
    entities: CatalogDefinitionEntry;
    loadbalancers: CatalogDefinitionEntry;
    functions: CatalogDefinitionEntry;
  };
}

export type ComponentsCatalogTypes =
  | ICamelComponentDefinition
  | ICamelProcessorDefinition
  | ICamelLanguageDefinition
  | ICamelDataformatDefinition
  | ICamelLoadBalancerDefinition
  | IKameletDefinition
  | ICitrusComponentDefinition
  | Record<string, KaotoFunction>;
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
  [CatalogKind.Entity]?: Record<string, ICamelProcessorDefinition>;
  [CatalogKind.Language]?: Record<string, ICamelLanguageDefinition>;
  [CatalogKind.Dataformat]?: Record<string, ICamelDataformatDefinition>;
  [CatalogKind.Loadbalancer]?: Record<string, ICamelLoadBalancerDefinition>;
  [CatalogKind.Kamelet]?: Record<string, IKameletDefinition>;
  [CatalogKind.TestActionGroup]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.TestAction]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.TestContainer]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.TestEndpoint]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.TestFunction]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.TestValidationMatcher]?: Record<string, ICitrusComponentDefinition>;
  [CatalogKind.Function]?: Record<string, Record<string, KaotoFunction>>;
}
