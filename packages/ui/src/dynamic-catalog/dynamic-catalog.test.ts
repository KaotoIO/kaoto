import { DynamicCatalog } from './dynamic-catalog';
import { ICatalogProvider } from './models';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

describe('DynamicCatalog', () => {
  let mockProvider: ICatalogProvider<TestEntity>;
  let catalog: DynamicCatalog<TestEntity>;

  beforeEach(() => {
    mockProvider = {
      id: 'test-provider',
      fetch: () => Promise.resolve(undefined),
      fetchAll: () => Promise.resolve({}),
    };
    catalog = new DynamicCatalog(mockProvider);
  });

  describe('get', () => {
    it('removes a cached entry when a fresh lookup no longer finds it', async () => {
      const entity = { id: '1', name: 'removed', value: 1 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValueOnce(entity).mockResolvedValue(undefined);

      await catalog.get('removed');
      await expect(catalog.get('removed', { forceFresh: true })).resolves.toBeUndefined();
      await expect(catalog.get('removed')).resolves.toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('keeps an entry installed by getAll when an earlier fresh lookup returns undefined', async () => {
      let resolveMissing!: (entity: TestEntity | undefined) => void;
      const missingFetch = new Promise<TestEntity | undefined>((resolve) => {
        resolveMissing = resolve;
      });
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockImplementationOnce(() => missingFetch);
      const refreshed = { id: '1', name: 'refreshed', value: 2 };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue({ entry: refreshed });

      const oldLookup = catalog.get('entry', { forceFresh: true });
      await expect(catalog.getAll()).resolves.toEqual({ entry: refreshed });
      resolveMissing(undefined);

      await expect(oldLookup).resolves.toBeUndefined();
      await expect(catalog.get('entry')).resolves.toBe(refreshed);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not restore an entry from an older lookup after a fresh lookup removes it', async () => {
      const original = { id: '1', name: 'original', value: 1 };
      const stale = { id: '1', name: 'stale', value: 2 };
      let resolveStale!: (entity: TestEntity) => void;
      const staleFetch = new Promise<TestEntity>((resolve) => {
        resolveStale = resolve;
      });
      const fetchSpy = vi
        .spyOn(mockProvider, 'fetch')
        .mockResolvedValueOnce(original)
        .mockImplementationOnce(() => staleFetch)
        .mockResolvedValue(undefined);

      await catalog.get('entry');
      const oldLookup = catalog.get('entry', { forceFresh: true });
      await expect(catalog.get('entry', { forceFresh: true })).resolves.toBeUndefined();
      resolveStale(stale);

      await expect(oldLookup).resolves.toBe(stale);
      await expect(catalog.get('entry')).resolves.toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('does not cache a lookup that finishes after the cache is cleared', async () => {
      const stale = { id: '1', name: 'stale', value: 1 };
      const current = { id: '1', name: 'current', value: 2 };
      let resolveStale!: (entity: TestEntity) => void;
      const staleFetch = new Promise<TestEntity>((resolve) => {
        resolveStale = resolve;
      });
      const fetchSpy = vi
        .spyOn(mockProvider, 'fetch')
        .mockImplementationOnce(() => staleFetch)
        .mockResolvedValueOnce(current);

      const oldLookup = catalog.get('entry');
      catalog.clearCache();
      resolveStale(stale);

      await expect(oldLookup).resolves.toBe(stale);
      await expect(catalog.get('entry')).resolves.toBe(current);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it.each(['constructor', '__proto__'])('caches arbitrary provider keys such as %s', async (key) => {
      const entity = { id: '1', name: key, value: 1 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(entity);

      await expect(catalog.get(key)).resolves.toEqual(entity);
      await expect(catalog.get(key)).resolves.toEqual(entity);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should fetch entity from provider when not in cache', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test-entity', value: 42 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      const result = await catalog.get('entity-key');

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledWith('entity-key');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return cached entity on subsequent calls', async () => {
      const mockEntity: TestEntity = { id: '2', name: 'cached-entity', value: 99 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      const firstResult = await catalog.get('cached-key');
      expect(firstResult).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.get('cached-key');
      expect(secondResult).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceFresh option is true', async () => {
      const firstEntity: TestEntity = { id: '3', name: 'first-version', value: 1 };
      const secondEntity: TestEntity = { id: '3', name: 'second-version', value: 2 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch');
      fetchSpy.mockResolvedValueOnce(firstEntity).mockResolvedValueOnce(secondEntity);

      const firstResult = await catalog.get('entity-key');
      expect(firstResult).toBe(firstEntity);

      const secondResult = await catalog.get('entity-key', { forceFresh: true });
      expect(secondResult).toBe(secondEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should use cache when forceFresh option is false', async () => {
      const mockEntity: TestEntity = { id: '4', name: 'entity', value: 50 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      await catalog.get('key');
      const result = await catalog.get('key', { forceFresh: false });

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when provider returns undefined', async () => {
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(undefined);

      const result = await catalog.get('non-existent-key');

      expect(result).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith('non-existent-key');
    });

    it('should not cache undefined values', async () => {
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(undefined);

      const firstResult = await catalog.get('missing-key');
      expect(firstResult).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.get('missing-key');
      expect(secondResult).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple different keys independently', async () => {
      const entity1: TestEntity = { id: '1', name: 'first', value: 10 };
      const entity2: TestEntity = { id: '2', name: 'second', value: 20 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch');
      fetchSpy.mockResolvedValueOnce(entity1).mockResolvedValueOnce(entity2);

      const result1 = await catalog.get('key1');
      const result2 = await catalog.get('key2');

      expect(result1).toBe(entity1);
      expect(result2).toBe(entity2);
      expect(fetchSpy).toHaveBeenCalledWith('key1');
      expect(fetchSpy).toHaveBeenCalledWith('key2');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should use default options when no options provided', async () => {
      const mockEntity: TestEntity = { id: '5', name: 'default-options', value: 123 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      const result = await catalog.get('key');

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledWith('key');
    });

    it('should handle provider errors gracefully', async () => {
      const error = new Error('Provider fetch failed');
      vi.spyOn(mockProvider, 'fetch').mockRejectedValue(error);

      await expect(catalog.get('error-key')).rejects.toThrow('Provider fetch failed');
    });
  });

  describe('getAll', () => {
    it('replaces cached snapshots and removes keys missing from a fresh response', async () => {
      vi.spyOn(mockProvider, 'fetchAll')
        .mockResolvedValueOnce({ removed: { id: '1', name: 'removed', value: 1 } })
        .mockResolvedValueOnce({ added: { id: '2', name: 'added', value: 2 } })
        .mockResolvedValueOnce({});

      await catalog.getAll();
      await expect(catalog.getAll({ forceFresh: true })).resolves.toEqual({
        added: { id: '2', name: 'added', value: 2 },
      });
      await expect(catalog.get('removed')).resolves.toBeUndefined();
      await expect(catalog.getAll({ forceFresh: true })).resolves.toEqual({});
    });

    it('retries after an initial fetch fails and preserves a snapshot when its refresh fails', async () => {
      const snapshot = { entry: { id: '1', name: 'entry', value: 1 } };
      vi.spyOn(mockProvider, 'fetchAll')
        .mockRejectedValueOnce(new Error('Initial failure'))
        .mockResolvedValueOnce(snapshot)
        .mockRejectedValueOnce(new Error('Refresh failure'));

      await expect(catalog.getAll()).rejects.toThrow('Initial failure');
      await expect(catalog.getAll()).resolves.toEqual(snapshot);
      await expect(catalog.getAll({ forceFresh: true })).rejects.toThrow('Refresh failure');
      await expect(catalog.getAll()).resolves.toEqual(snapshot);
    });

    it('should fetch all entities from provider when cache is empty', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
        entity3: { id: '3', name: 'third', value: 30 },
      };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(result).toEqual(entities);
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should return cached entities on subsequent calls', async () => {
      const entities = {
        cached1: { id: '1', name: 'cached-first', value: 100 },
        cached2: { id: '2', name: 'cached-second', value: 200 },
      };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const firstResult = await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.getAll();
      expect(secondResult).toEqual(firstResult);
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceFresh option is true', async () => {
      const firstEntities = { key1: { id: '1', name: 'first', value: 1 } };
      const secondEntities = { key1: { id: '1', name: 'updated', value: 2 } };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll');
      fetchAllSpy.mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const result = await catalog.getAll({ forceFresh: true });

      expect(result).toEqual(secondEntities);
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should not retain stale keys when an entity is renamed on forceFresh', async () => {
      const firstEntities = { 'old-name': { id: '1', name: 'old-name', value: 1 } };
      const secondEntities = { 'new-name': { id: '1', name: 'new-name', value: 1 } };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const result = await catalog.getAll({ forceFresh: true });

      expect(result).toHaveProperty('new-name');
      expect(result).not.toHaveProperty('old-name');
    });

    it('should filter entities when filterFn is provided', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
        entity3: { id: '3', name: 'third', value: 30 },
      };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const filterFn = (_key: string, entity: TestEntity) => entity.value > 15;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({
        entity2: entities.entity2,
        entity3: entities.entity3,
      });
      expect(result).not.toHaveProperty('entity1');
    });

    it('should filter by key when filterFn uses key parameter', async () => {
      const entities = {
        'include-this': { id: '1', name: 'first', value: 10 },
        'exclude-this': { id: '2', name: 'second', value: 20 },
        'include-that': { id: '3', name: 'third', value: 30 },
      };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const filterFn = (key: string) => key.startsWith('include');
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({
        'include-this': entities['include-this'],
        'include-that': entities['include-that'],
      });
      expect(result).not.toHaveProperty('exclude-this');
    });

    it('should return empty object when all entities are filtered out', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const filterFn = () => false;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({});
    });

    it('should return all entities when filterFn is not provided', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('entity1');
      expect(result).toHaveProperty('entity2');
    });

    it('should handle empty object from provider', async () => {
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue({});

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should handle undefined response from provider', async () => {
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue({});

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should cache entities from fetchAll for individual get calls', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch');
      vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      await catalog.getAll();

      const result = await catalog.get('entity1');
      expect(result).toBe(entities.entity1);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should combine filterFn with forceFresh option', async () => {
      const firstEntities = { key1: { id: '1', name: 'old', value: 5 } };
      const secondEntities = {
        key1: { id: '1', name: 'new', value: 15 },
        key2: { id: '2', name: 'another', value: 25 },
      };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll');
      fetchAllSpy.mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const filterFn = (_key: string, entity: TestEntity) => entity.value > 10;
      const result = await catalog.getAll({ forceFresh: true, filterFn });

      expect(result).toEqual({
        key1: secondEntities.key1,
        key2: secondEntities.key2,
      });
    });

    it('should handle provider errors gracefully', async () => {
      const error = new Error('FetchAll failed');
      vi.spyOn(mockProvider, 'fetchAll').mockRejectedValue(error);

      await expect(catalog.getAll()).rejects.toThrow('FetchAll failed');
    });

    it('should not let an older overlapping forceFresh overwrite a newer snapshot', async () => {
      // Two concurrent forceFresh calls must share one fetchAll invocation;
      // the cache must reflect the single resolved snapshot, not be
      // overwritten by a second in-flight response.
      const entities = { key1: { id: '1', name: 'shared', value: 1 } };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      // Fire two concurrent forceFresh calls without awaiting between them.
      const [result1, result2] = await Promise.all([
        catalog.getAll({ forceFresh: true }),
        catalog.getAll({ forceFresh: true }),
      ]);

      // Only one fetchAll should have been issued.
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
      // Both callers receive the same snapshot.
      expect(result1).toEqual(entities);
      expect(result2).toEqual(entities);
    });

    it('should use cache even if filterFn is provided on second call', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      await catalog.getAll();

      const filterFn = (_key: string, entity: TestEntity) => entity.value > 15;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({ entity2: entities.entity2 });
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should fetch all entities even if cache was partially populated by get()', async () => {
      const singleEntity: TestEntity = { id: '1', name: 'single', value: 10 };
      const allEntities = {
        entity1: singleEntity,
        entity2: { id: '2', name: 'second', value: 20 },
        entity3: { id: '3', name: 'third', value: 30 },
      };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(singleEntity);
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(allEntities);

      await catalog.get('entity1');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const result = await catalog.getAll();
      expect(result).toEqual(allEntities);
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe('clearCache', () => {
    it('ignores a full catalog load that finishes after the cache is cleared', async () => {
      let resolveStale!: (entities: Record<string, TestEntity>) => void;
      const staleFetch = new Promise<Record<string, TestEntity>>((resolve) => {
        resolveStale = resolve;
      });
      const current = { entry: { id: '2', name: 'current', value: 2 } };
      const fetchAllSpy = vi
        .spyOn(mockProvider, 'fetchAll')
        .mockImplementationOnce(() => staleFetch)
        .mockResolvedValueOnce(current);

      const oldLoad = catalog.getAll();
      catalog.clearCache();
      resolveStale({ entry: { id: '1', name: 'stale', value: 1 } });

      expect(Object.keys(await oldLoad)).toEqual([]);
      await expect(catalog.getAll()).resolves.toEqual(current);
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('keeps sharing a new refresh when an invalidated refresh finishes first', async () => {
      let resolveStale!: (entities: Record<string, TestEntity>) => void;
      let resolveCurrent!: (entities: Record<string, TestEntity>) => void;
      const staleFetch = new Promise<Record<string, TestEntity>>((resolve) => {
        resolveStale = resolve;
      });
      const currentFetch = new Promise<Record<string, TestEntity>>((resolve) => {
        resolveCurrent = resolve;
      });
      const fetchAllSpy = vi
        .spyOn(mockProvider, 'fetchAll')
        .mockImplementationOnce(() => staleFetch)
        .mockImplementationOnce(() => currentFetch);

      const oldLoad = catalog.getAll();
      catalog.clearCache();
      const currentLoad = catalog.getAll();
      resolveStale({ entry: { id: '1', name: 'stale', value: 1 } });
      expect(Object.keys(await oldLoad)).toEqual([]);

      const concurrentLoad = catalog.getAll({ forceFresh: true });
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);

      const current = { entry: { id: '2', name: 'current', value: 2 } };
      resolveCurrent(current);
      await expect(currentLoad).resolves.toEqual(current);
      await expect(concurrentLoad).resolves.toEqual(current);
      await expect(catalog.getAll()).resolves.toEqual(current);
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear all cached entities', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test', value: 100 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      await catalog.get('test-key');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      catalog.clearCache();

      await catalog.get('test-key');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear cache populated by getAll', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      const fetchAllSpy = vi.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);

      catalog.clearCache();

      await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should allow clearing an empty cache without errors', () => {
      expect(() => {
        catalog.clearCache();
      }).not.toThrow();
    });

    it('should clear multiple cached entries', async () => {
      const entity1: TestEntity = { id: '1', name: 'first', value: 10 };
      const entity2: TestEntity = { id: '2', name: 'second', value: 20 };
      const entity3: TestEntity = { id: '3', name: 'third', value: 30 };
      const fetchSpy = vi.spyOn(mockProvider, 'fetch');
      fetchSpy.mockResolvedValueOnce(entity1);
      fetchSpy.mockResolvedValueOnce(entity2);
      fetchSpy.mockResolvedValueOnce(entity3);

      await catalog.get('key1');
      await catalog.get('key2');
      await catalog.get('key3');
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      catalog.clearCache();

      fetchSpy.mockResolvedValueOnce(entity1);
      fetchSpy.mockResolvedValueOnce(entity2);
      fetchSpy.mockResolvedValueOnce(entity3);

      await catalog.get('key1');
      await catalog.get('key2');
      await catalog.get('key3');
      expect(fetchSpy).toHaveBeenCalledTimes(6);
    });

    it('should be callable multiple times', () => {
      expect(() => {
        catalog.clearCache();
        catalog.clearCache();
        catalog.clearCache();
      }).not.toThrow();
    });
  });

  it('should maintain cache integrity after partial failures', async () => {
    const goodEntity: TestEntity = { id: '1', name: 'good', value: 50 };
    const fetchSpy = vi.spyOn(mockProvider, 'fetch');
    fetchSpy.mockResolvedValueOnce(goodEntity);
    fetchSpy.mockRejectedValueOnce(new Error('Fetch failed'));
    fetchSpy.mockResolvedValueOnce(goodEntity);

    await catalog.get('good-key');

    await expect(catalog.get('bad-key')).rejects.toThrow('Fetch failed');

    const result = await catalog.get('good-key');
    expect(result).toBe(goodEntity);
  });
});
