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
    it('should fetch entity from provider when not in cache', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test-entity', value: 42 };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      const result = await catalog.get('entity-key');

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledWith('entity-key');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return cached entity on subsequent calls', async () => {
      const mockEntity: TestEntity = { id: '2', name: 'cached-entity', value: 99 };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

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
      const fetchSpy = jest.spyOn(mockProvider, 'fetch');
      fetchSpy.mockResolvedValueOnce(firstEntity).mockResolvedValueOnce(secondEntity);

      const firstResult = await catalog.get('entity-key');
      expect(firstResult).toBe(firstEntity);

      const secondResult = await catalog.get('entity-key', { forceFresh: true });
      expect(secondResult).toBe(secondEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should use cache when forceFresh option is false', async () => {
      const mockEntity: TestEntity = { id: '4', name: 'entity', value: 50 };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      await catalog.get('key');
      const result = await catalog.get('key', { forceFresh: false });

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when provider returns undefined', async () => {
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(undefined);

      const result = await catalog.get('non-existent-key');

      expect(result).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith('non-existent-key');
    });

    it('should not cache undefined values', async () => {
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(undefined);

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
      const fetchSpy = jest.spyOn(mockProvider, 'fetch');
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
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

      const result = await catalog.get('key');

      expect(result).toBe(mockEntity);
      expect(fetchSpy).toHaveBeenCalledWith('key');
    });

    it('should handle provider errors gracefully', async () => {
      const error = new Error('Provider fetch failed');
      jest.spyOn(mockProvider, 'fetch').mockRejectedValue(error);

      await expect(catalog.get('error-key')).rejects.toThrow('Provider fetch failed');
    });
  });

  describe('getAll', () => {
    it('should fetch all entities from provider when cache is empty', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
        entity3: { id: '3', name: 'third', value: 30 },
      };
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(result).toEqual(entities);
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should return cached entities on subsequent calls', async () => {
      const entities = {
        cached1: { id: '1', name: 'cached-first', value: 100 },
        cached2: { id: '2', name: 'cached-second', value: 200 },
      };
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const firstResult = await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.getAll();
      expect(secondResult).toEqual(firstResult);
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceFresh option is true', async () => {
      const firstEntities = { key1: { id: '1', name: 'first', value: 1 } };
      const secondEntities = { key1: { id: '1', name: 'updated', value: 2 } };
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll');
      fetchAllSpy.mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const result = await catalog.getAll({ forceFresh: true });

      expect(result).toEqual(secondEntities);
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should filter entities when filterFn is provided', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
        entity3: { id: '3', name: 'third', value: 30 },
      };
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

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
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

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
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const filterFn = () => false;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({});
    });

    it('should return all entities when filterFn is not provided', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('entity1');
      expect(result).toHaveProperty('entity2');
    });

    it('should handle empty object from provider', async () => {
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue({});

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should handle undefined response from provider', async () => {
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue({});

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should cache entities from fetchAll for individual get calls', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch');
      jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

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
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll');
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
      jest.spyOn(mockProvider, 'fetchAll').mockRejectedValue(error);

      await expect(catalog.getAll()).rejects.toThrow('FetchAll failed');
    });

    it('should use cache even if filterFn is provided on second call', async () => {
      const entities = {
        entity1: { id: '1', name: 'first', value: 10 },
        entity2: { id: '2', name: 'second', value: 20 },
      };
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      await catalog.getAll();

      const filterFn = (_key: string, entity: TestEntity) => entity.value > 15;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({ entity2: entities.entity2 });
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entities', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test', value: 100 };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch').mockResolvedValue(mockEntity);

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
      const fetchAllSpy = jest.spyOn(mockProvider, 'fetchAll').mockResolvedValue(entities);

      await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(1);

      catalog.clearCache();

      await catalog.getAll();
      expect(fetchAllSpy).toHaveBeenCalledTimes(2);
    });

    it('should allow clearing an empty cache without errors', () => {
      expect(() => catalog.clearCache()).not.toThrow();
    });

    it('should clear multiple cached entries', async () => {
      const entity1: TestEntity = { id: '1', name: 'first', value: 10 };
      const entity2: TestEntity = { id: '2', name: 'second', value: 20 };
      const entity3: TestEntity = { id: '3', name: 'third', value: 30 };
      const fetchSpy = jest.spyOn(mockProvider, 'fetch');
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
    const fetchSpy = jest.spyOn(mockProvider, 'fetch');
    fetchSpy.mockResolvedValueOnce(goodEntity);
    fetchSpy.mockRejectedValueOnce(new Error('Fetch failed'));
    fetchSpy.mockResolvedValueOnce(goodEntity);

    await catalog.get('good-key');

    await expect(catalog.get('bad-key')).rejects.toThrow('Fetch failed');

    const result = await catalog.get('good-key');
    expect(result).toBe(goodEntity);
  });
});
