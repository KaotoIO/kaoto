import { KaotoFunction } from '@kaoto/camel-catalog/catalog-index.d.ts';

import { ComponentsCatalog, ComponentsCatalogTypes } from '../../camel-catalog-index';
import { ICamelComponentDefinition } from '../../camel-components-catalog';
import { ICamelDataformatDefinition } from '../../camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../../camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from '../../camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
import { ICitrusComponentDefinition } from '../../citrus-catalog';
import { IKameletDefinition } from '../../kamelets-catalog';

export class CamelCatalogService {
  private static catalogs: ComponentsCatalog = {};

  static getCatalogByKey<CATALOG_KEY extends CatalogKind>(catalogKey: CATALOG_KEY): ComponentsCatalog[CATALOG_KEY] {
    return this.catalogs[catalogKey];
  }

  static setCatalogKey<CATALOG_KEY extends CatalogKind>(
    catalogKey: CATALOG_KEY,
    catalog?: ComponentsCatalog[CATALOG_KEY],
  ): void {
    this.catalogs[catalogKey] = catalog;
  }

  static getComponent(catalogKey: CatalogKind.Component, componentName?: string): ICamelComponentDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Processor, componentName?: string): ICamelProcessorDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Pattern, patternName?: string): ICamelProcessorDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Entity, entityName?: string): ICamelProcessorDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Language, languageName?: string): ICamelLanguageDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.Dataformat,
    dataformatName?: string,
  ): ICamelDataformatDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.Loadbalancer,
    loadBalancerName?: string,
  ): ICamelLoadBalancerDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Kamelet, componentName?: string): IKameletDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestActionGroup,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestAction,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestContainer,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestEndpoint,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestFunction,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.TestValidationMatcher,
    componentName?: string,
  ): ICitrusComponentDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.Function,
    componentName?: string,
  ): Record<string, KaotoFunction> | undefined;
  static getComponent(catalogKey: CatalogKind, componentName?: string): ComponentsCatalogTypes | undefined;
  static getComponent(catalogKey: CatalogKind, componentName?: string): ComponentsCatalogTypes | undefined {
    if (componentName === undefined) return undefined;

    return this.catalogs[catalogKey]?.[componentName];
  }

  static getLanguageMap(): Record<string, ICamelLanguageDefinition> {
    return this.catalogs[CatalogKind.Language] || {};
  }

  static getDataFormatMap(): Record<string, ICamelDataformatDefinition> {
    return this.catalogs[CatalogKind.Dataformat] || {};
  }

  static getLoadBalancerMap(): Record<string, ICamelLoadBalancerDefinition> {
    return this.catalogs[CatalogKind.Loadbalancer] || {};
  }

  /**
   * Public only as a convenience method for test
   * not meant to be used in production code
   */
  static clearCatalogs(): void {
    this.catalogs = {};
  }

  /** Method to return whether this is a Camel Component or a Kamelet */
  static getCatalogLookup(componentName: string): {
    catalogKind: CatalogKind.Component;
    definition?: ICamelComponentDefinition;
  };
  static getCatalogLookup(componentName: string): {
    catalogKind: CatalogKind.Kamelet;
    definition?: IKameletDefinition;
  };
  static getCatalogLookup(
    componentName: string,
  ): { catalogKind: CatalogKind; definition?: ComponentsCatalogTypes } | undefined {
    if (!componentName) {
      return undefined;
    }

    if (componentName.startsWith('kamelet:')) {
      const definition = this.getComponent(CatalogKind.Kamelet, componentName.replace('kamelet:', ''));

      if (definition) {
        return {
          catalogKind: CatalogKind.Kamelet,
          definition,
        };
      }

      // If the Kamelet is not found, we fallback to the Kamelet component
      return {
        catalogKind: CatalogKind.Component,
        definition: this.getComponent(CatalogKind.Component, 'kamelet'),
      };
    }

    return {
      catalogKind: CatalogKind.Component,
      definition: this.getComponent(CatalogKind.Component, componentName),
    };
  }
}
