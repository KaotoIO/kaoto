import { isDefined } from '@kaoto/forms';

import { ICatalogProvider, IDynamicCatalog } from './models';

export class DynamicCatalog<T = unknown> implements IDynamicCatalog<T> {
  protected readonly cache: Record<string, T> = Object.create(null);
  private fetchedAll = false;
  private refreshPromise: Promise<void> | null = null;
  private cacheGeneration = 0;
  private readonly entryWriteVersions = new Map<string, number>();
  private entryWriteVersion = 0;

  constructor(protected readonly provider: ICatalogProvider<T>) {}

  /**
   * Gets one entry, reloading it when requested or absent from the cache.
   * A lookup invalidated by clearCache or a newer cache write cannot replace that write.
   */
  async get(key: string, options: { forceFresh?: boolean } = {}): Promise<T | undefined> {
    if (!options.forceFresh && isDefined(this.cache[key])) {
      return this.cache[key];
    }

    const generation = this.cacheGeneration;
    const entryWriteVersion = this.entryWriteVersions.get(key);
    const entity = await this.provider.fetch(key);
    if (generation === this.cacheGeneration && entryWriteVersion === this.entryWriteVersions.get(key)) {
      if (entity !== undefined) {
        this.cache[key] = entity;
        this.entryWriteVersions.set(key, ++this.entryWriteVersion);
      } else if (options.forceFresh) {
        delete this.cache[key];
        this.entryWriteVersions.set(key, ++this.entryWriteVersion);
      }
    }

    return entity;
  }

  /**
   * Gets all entries, sharing an in-flight refresh between concurrent callers.
   * A refresh invalidated by clearCache cannot replace the current entries.
   */
  async getAll(
    options: { forceFresh?: boolean; filterFn?: (key: string, entity: T) => boolean } = {},
  ): Promise<Record<string, T>> {
    if (options.forceFresh || !this.fetchedAll) {
      if (!this.refreshPromise) {
        const generation = this.cacheGeneration;
        const refreshPromise = this.provider
          .fetchAll()
          .then((entities) => {
            if (generation !== this.cacheGeneration) return;
            Object.keys(this.cache).forEach((key) => {
              delete this.cache[key];
            });
            Object.entries(entities).forEach(([key, entity]) => {
              this.cache[key] = entity;
            });
            this.cacheGeneration++;
            this.entryWriteVersions.clear();
            this.fetchedAll = true;
          })
          .finally(() => {
            if (this.refreshPromise === refreshPromise) {
              this.refreshPromise = null;
            }
          });
        this.refreshPromise = refreshPromise;
      }
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

  /** Removes cached entries and invalidates writes from requests already in flight. */
  clearCache(): void {
    this.cacheGeneration++;
    Object.keys(this.cache).forEach((key) => {
      delete this.cache[key];
    });
    this.entryWriteVersions.clear();
    this.fetchedAll = false;
    this.refreshPromise = null;
  }
}
