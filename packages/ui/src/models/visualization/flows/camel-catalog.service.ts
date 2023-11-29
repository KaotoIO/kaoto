import { ComponentsCatalog, ComponentsCatalogTypes } from '../../camel-catalog-index';
import { ICamelComponentDefinition } from '../../camel-components-catalog';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { ICamelDataformatDefinition } from '../../camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../../camel-languages-catalog';

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
  static getComponent(catalogKey: CatalogKind.Language, languageName?: string): ICamelLanguageDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind.Dataformat,
    dataformatName?: string,
  ): ICamelDataformatDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.Kamelet, componentName?: string): IKameletDefinition | undefined;
  static getComponent(catalogKey: CatalogKind.KameletBoundary, componentName?: string): IKameletDefinition | undefined;
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

  /**
   * Public only as a convenience method for test
   * not meant to be used in production code
   */
  static clearCatalogs(): void {
    this.catalogs = {};
  }
}
