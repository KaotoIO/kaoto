import { Entry, Index } from '@kaoto/camel-catalog/types';
import { ICamelComponentDefinition } from './camel-components-catalog';
import { ICamelDataformatDefinition } from './camel-dataformats-catalog';
import { ICamelLanguageDefinition } from './camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from './camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from './camel-processors-catalog';
import { CatalogKind } from './catalog-kind';
import { IKameletDefinition } from './kamelets-catalog';

export interface CamelCatalogIndex extends Omit<Index, 'catalogs'> {
  catalogs: {
    models: Entry;
    components: Entry;
    languages: Entry;
    dataformats: Entry;
    kamelets: Entry;
    kameletBoundaries: Entry;
    patterns: Entry;
    entities: Entry;
    loadbalancers: Entry;
  };
}

export type ComponentsCatalogTypes =
  | ICamelComponentDefinition
  | ICamelProcessorDefinition
  | ICamelLanguageDefinition
  | ICamelDataformatDefinition
  | ICamelLoadBalancerDefinition
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
  [CatalogKind.Entity]?: Record<string, ICamelProcessorDefinition>;
  [CatalogKind.Language]?: Record<string, ICamelLanguageDefinition>;
  [CatalogKind.Dataformat]?: Record<string, ICamelDataformatDefinition>;
  [CatalogKind.Loadbalancer]?: Record<string, ICamelLoadBalancerDefinition>;
  [CatalogKind.Kamelet]?: Record<string, IKameletDefinition>;
}
