import { KaotoFunction, KaotoFunctionArgument } from '@kaoto/camel-catalog/catalog-index.d.ts';

import { ComponentsCatalog, ComponentsCatalogTypes } from '../../camel/camel-catalog-index';
import { ICamelComponentDefinition } from '../../camel/camel-components-catalog';
import { ICamelDataformatDefinition } from '../../camel/camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../../camel/camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from '../../camel/camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from '../../camel/camel-processors-catalog';
import { IKameletDefinition } from '../../camel/kamelets-catalog';
import { CatalogKind } from '../../catalog-kind';
import { ICitrusComponentDefinition } from '../../citrus/citrus-catalog';

export class CamelCatalogService {
  private static catalogs: ComponentsCatalog = {};

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
  ): Record<string, KaotoFunction<KaotoFunctionArgument>> | undefined;
  static getComponent(catalogKey: CatalogKind, componentName?: string): ComponentsCatalogTypes | undefined;
  static getComponent(catalogKey: CatalogKind, componentName?: string): ComponentsCatalogTypes | undefined {
    if (componentName === undefined) return undefined;

    return this.catalogs[catalogKey]?.[componentName];
  }

  /**
   * Public only as a convenience method for test
   * not meant to be used in production code
   */
  static clearCatalogs(): void {
    this.catalogs = {};
  }
}
