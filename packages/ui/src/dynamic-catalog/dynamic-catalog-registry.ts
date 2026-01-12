import { CatalogKind } from '../models/catalog-kind';
import { DynamicCatalogTypeMap, IDynamicCatalog, IDynamicCatalogRegistry } from './models';

export class DynamicCatalogRegistry {
  private static instance: CatalogsRegistry;

  static get(): CatalogsRegistry {
    if (!this.instance) {
      this.instance = new CatalogsRegistry();
    }

    return this.instance;
  }
}

class CatalogsRegistry implements IDynamicCatalogRegistry {
  private readonly catalogs = new Map<CatalogKind, IDynamicCatalog<unknown>>();

  setCatalog<K extends CatalogKind>(kind: K, catalog: IDynamicCatalog<DynamicCatalogTypeMap[K]>): void {
    this.catalogs.set(kind, catalog);
  }

  getCatalog<K extends CatalogKind>(kind: K): IDynamicCatalog<DynamicCatalogTypeMap[K]> | undefined {
    return this.catalogs.get(kind) as IDynamicCatalog<DynamicCatalogTypeMap[K]> | undefined;
  }

  async getEntity<K extends CatalogKind>(
    kind: K,
    key: string,
    options: { forceFresh?: boolean } = {},
  ): Promise<DynamicCatalogTypeMap[K] | undefined> {
    const catalog = this.getCatalog(kind);
    return catalog?.get(key, options);
  }

  getEntityFromCache<K extends CatalogKind>(kind: K, key: string): DynamicCatalogTypeMap[K] | undefined {
    const catalog = this.getCatalog(kind);
    return catalog?.getFromCache(key);
  }

  clearRegistry(): void {
    this.catalogs.clear();
  }
}
