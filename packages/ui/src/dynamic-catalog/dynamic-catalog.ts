import { isDefined } from '@kaoto/forms';

import { ICatalogProvider, IDynamicCatalog } from './models';

export class DynamicCatalog<T = unknown> implements IDynamicCatalog<T> {
  protected readonly cache: Record<string, T> = {};
  private fetchedAll = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(protected readonly provider: ICatalogProvider<T>) {}

  async get(key: string, options: { forceFresh?: boolean } = {}): Promise<T | undefined> {
    if (!options.forceFresh && isDefined(this.cache[key])) {
      return this.cache[key];
    }

    const entity = await this.provider.fetch(key);
    if (entity !== undefined) {
      this.cache[key] = entity;
    }

    return entity;
  }

  async getAll(
    options: { forceFresh?: boolean; filterFn?: (key: string, entity: T) => boolean } = {},
  ): Promise<Record<string, T>> {
    if (options.forceFresh || !this.fetchedAll) {
      this.refreshPromise ??= this.provider.fetchAll().then((entities) => {
        Object.keys(this.cache).forEach((key) => {
          delete this.cache[key];
        });
        Object.entries(entities).forEach(([key, entity]) => {
          this.cache[key] = entity;
        });
        this.fetchedAll = true;
        this.refreshPromise = null;
      });
      await this.refreshPromise;
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
    this.refreshPromise = null;
  }
}
