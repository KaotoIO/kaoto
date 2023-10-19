import { ComponentsCatalog } from '../../camel-catalog-index';
import { ICamelComponentDefinition } from '../../camel-components-catalog';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
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
  static getComponent(catalogKey: CatalogKind.Kamelet, componentName?: string): IKameletDefinition | undefined;
  static getComponent(
    catalogKey: CatalogKind,
    componentName?: string,
  ): ICamelComponentDefinition | ICamelProcessorDefinition | IKameletDefinition | undefined {
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
