import { isDefined } from '@kaoto/forms';

import { ICatalogProvider, IDynamicCatalog } from './models';

export class DynamicCatalog<T = unknown> implements IDynamicCatalog<T> {
  protected readonly cache: Record<string, T> = Object.create(null);
  private fetchedAll = false;

  constructor(protected readonly provider: ICatalogProvider<T>) {}

  async get(key: string, options: { forceFresh?: boolean } = {}): Promise<T | undefined> {
    if (!options.forceFresh && isDefined(this.cache[key])) {
      return this.cache[key];
    }

    const entity = await this.provider.fetch(key);
    if (entity !== undefined) {
      this.cache[key] = entity;
    } else if (options.forceFresh) {
      delete this.cache[key];
    }

    return entity;
  }

  async getAll(
    options: { forceFresh?: boolean; filterFn?: (key: string, entity: T) => boolean } = {},
  ): Promise<Record<string, T>> {
    if (options.forceFresh || !this.fetchedAll) {
      const entities = await this.provider.fetchAll();
      this.clearCache();
      Object.entries(entities).forEach(([key, entity]) => {
        this.cache[key] = entity;
      });
      this.fetchedAll = true;
    }

    const { filterFn } = options;
    if (typeof filterFn === 'function') {
      return Object.entries(this.cache)
        .filter(([key, entity]) => filterFn(key, entity))
        .reduce(
          (catalog, [key, entity]) => {
            catalog[key] = entity;
            return catalog;
          },
          {} as Record<string, T>,
        );
    }

    return this.cache;
  }

  clearCache(): void {
    Object.keys(this.cache).forEach((key) => {
      delete this.cache[key];
    });
    this.fetchedAll = false;
  }
}
