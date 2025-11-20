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
      fetch: jest.fn(),
      fetchAll: jest.fn(),
    };
    catalog = new DynamicCatalog(mockProvider);
  });

  describe('get', () => {
    it('should fetch entity from provider when not in cache', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test-entity', value: 42 };
      (mockProvider.fetch as jest.Mock).mockResolvedValue(mockEntity);

      const result = await catalog.get('entity-key');

      expect(result).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledWith('entity-key');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached entity on subsequent calls', async () => {
      const mockEntity: TestEntity = { id: '2', name: 'cached-entity', value: 99 };
      (mockProvider.fetch as jest.Mock).mockResolvedValue(mockEntity);

      const firstResult = await catalog.get('cached-key');
      expect(firstResult).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.get('cached-key');
      expect(secondResult).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceFresh option is true', async () => {
      const firstEntity: TestEntity = { id: '3', name: 'first-version', value: 1 };
      const secondEntity: TestEntity = { id: '3', name: 'second-version', value: 2 };
      (mockProvider.fetch as jest.Mock).mockResolvedValueOnce(firstEntity).mockResolvedValueOnce(secondEntity);

      const firstResult = await catalog.get('entity-key');
      expect(firstResult).toBe(firstEntity);

      const secondResult = await catalog.get('entity-key', { forceFresh: true });
      expect(secondResult).toBe(secondEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(2);
    });

    it('should use cache when forceFresh option is false', async () => {
      const mockEntity: TestEntity = { id: '4', name: 'entity', value: 50 };
      (mockProvider.fetch as jest.Mock).mockResolvedValue(mockEntity);

      await catalog.get('key');
      const result = await catalog.get('key', { forceFresh: false });

      expect(result).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when provider returns undefined', async () => {
      (mockProvider.fetch as jest.Mock).mockResolvedValue(undefined);

      const result = await catalog.get('non-existent-key');

      expect(result).toBeUndefined();
      expect(mockProvider.fetch).toHaveBeenCalledWith('non-existent-key');
    });

    it('should not cache undefined values', async () => {
      (mockProvider.fetch as jest.Mock).mockResolvedValue(undefined);

      const firstResult = await catalog.get('missing-key');
      expect(firstResult).toBeUndefined();
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.get('missing-key');
      expect(secondResult).toBeUndefined();
      expect(mockProvider.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple different keys independently', async () => {
      const entity1: TestEntity = { id: '1', name: 'first', value: 10 };
      const entity2: TestEntity = { id: '2', name: 'second', value: 20 };
      (mockProvider.fetch as jest.Mock).mockResolvedValueOnce(entity1).mockResolvedValueOnce(entity2);

      const result1 = await catalog.get('key1');
      const result2 = await catalog.get('key2');

      expect(result1).toBe(entity1);
      expect(result2).toBe(entity2);
      expect(mockProvider.fetch).toHaveBeenCalledWith('key1');
      expect(mockProvider.fetch).toHaveBeenCalledWith('key2');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(2);
    });

    it('should use default options when no options provided', async () => {
      const mockEntity: TestEntity = { id: '5', name: 'default-options', value: 123 };
      (mockProvider.fetch as jest.Mock).mockResolvedValue(mockEntity);

      const result = await catalog.get('key');

      expect(result).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledWith('key');
    });

    it('should handle provider errors gracefully', async () => {
      const error = new Error('Provider fetch failed');
      (mockProvider.fetch as jest.Mock).mockRejectedValue(error);

      await expect(catalog.get('error-key')).rejects.toThrow('Provider fetch failed');
    });
  });

  describe('getAll', () => {
    it('should fetch all entities from provider when cache is empty', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
        { key: 'entity3', entity: { id: '3', name: 'third', value: 30 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(result).toEqual({
        entity1: entities[0].entity,
        entity2: entities[1].entity,
        entity3: entities[2].entity,
      });
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(1);
    });

    it('should return cached entities on subsequent calls', async () => {
      const entities = [
        { key: 'cached1', entity: { id: '1', name: 'cached-first', value: 100 } },
        { key: 'cached2', entity: { id: '2', name: 'cached-second', value: 200 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const firstResult = await catalog.getAll();
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(1);

      const secondResult = await catalog.getAll();
      expect(secondResult).toEqual(firstResult);
    });

    it('should bypass cache when forceFresh option is true', async () => {
      const firstEntities = [{ key: 'key1', entity: { id: '1', name: 'first', value: 1 } }];
      const secondEntities = [{ key: 'key1', entity: { id: '1', name: 'updated', value: 2 } }];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const result = await catalog.getAll({ forceFresh: true });

      expect(result).toEqual({ key1: secondEntities[0].entity });
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(2);
    });

    it('should filter entities when filterFn is provided', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
        { key: 'entity3', entity: { id: '3', name: 'third', value: 30 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const filterFn = (_key: string, entity: TestEntity) => entity.value > 15;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({
        entity2: entities[1].entity,
        entity3: entities[2].entity,
      });
      expect(result).not.toHaveProperty('entity1');
    });

    it('should filter by key when filterFn uses key parameter', async () => {
      const entities = [
        { key: 'include-this', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'exclude-this', entity: { id: '2', name: 'second', value: 20 } },
        { key: 'include-that', entity: { id: '3', name: 'third', value: 30 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const filterFn = (key: string) => key.startsWith('include');
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({
        'include-this': entities[0].entity,
        'include-that': entities[2].entity,
      });
      expect(result).not.toHaveProperty('exclude-this');
    });

    it('should return empty object when all entities are filtered out', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const filterFn = () => false;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({});
    });

    it('should return all entities when filterFn is not provided', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      const result = await catalog.getAll();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('entity1');
      expect(result).toHaveProperty('entity2');
    });

    it('should handle empty array from provider', async () => {
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue([]);

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should handle non-array response from provider', async () => {
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(undefined);

      const result = await catalog.getAll();

      expect(result).toEqual({});
    });

    it('should cache entities from fetchAll for individual get calls', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      await catalog.getAll();

      const result = await catalog.get('entity1');
      expect(result).toBe(entities[0].entity);
      expect(mockProvider.fetch).not.toHaveBeenCalled();
    });

    it('should combine filterFn with forceFresh option', async () => {
      const firstEntities = [{ key: 'key1', entity: { id: '1', name: 'old', value: 5 } }];
      const secondEntities = [
        { key: 'key1', entity: { id: '1', name: 'new', value: 15 } },
        { key: 'key2', entity: { id: '2', name: 'another', value: 25 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValueOnce(firstEntities).mockResolvedValueOnce(secondEntities);

      await catalog.getAll();
      const filterFn = (_key: string, entity: TestEntity) => entity.value > 10;
      const result = await catalog.getAll({ forceFresh: true, filterFn });

      expect(result).toEqual({
        key1: secondEntities[0].entity,
        key2: secondEntities[1].entity,
      });
    });

    it('should handle provider errors gracefully', async () => {
      const error = new Error('FetchAll failed');
      (mockProvider.fetchAll as jest.Mock).mockRejectedValue(error);

      await expect(catalog.getAll()).rejects.toThrow('FetchAll failed');
    });

    it('should use cache even if filterFn is provided on second call', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      await catalog.getAll();

      const filterFn = (_key: string, entity: TestEntity) => entity.value > 15;
      const result = await catalog.getAll({ filterFn });

      expect(result).toEqual({ entity2: entities[1].entity });
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entities', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'test', value: 100 };
      (mockProvider.fetch as jest.Mock).mockResolvedValue(mockEntity);

      await catalog.get('test-key');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);

      catalog.clearCache();

      await catalog.get('test-key');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache populated by getAll', async () => {
      const entities = [
        { key: 'entity1', entity: { id: '1', name: 'first', value: 10 } },
        { key: 'entity2', entity: { id: '2', name: 'second', value: 20 } },
      ];
      (mockProvider.fetchAll as jest.Mock).mockResolvedValue(entities);

      await catalog.getAll();
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(1);

      catalog.clearCache();

      await catalog.getAll();
      expect(mockProvider.fetchAll).toHaveBeenCalledTimes(2);
    });

    it('should allow clearing an empty cache without errors', () => {
      expect(() => catalog.clearCache()).not.toThrow();
    });

    it('should clear multiple cached entries', async () => {
      const entity1: TestEntity = { id: '1', name: 'first', value: 10 };
      const entity2: TestEntity = { id: '2', name: 'second', value: 20 };
      const entity3: TestEntity = { id: '3', name: 'third', value: 30 };
      (mockProvider.fetch as jest.Mock)
        .mockResolvedValueOnce(entity1)
        .mockResolvedValueOnce(entity2)
        .mockResolvedValueOnce(entity3);

      await catalog.get('key1');
      await catalog.get('key2');
      await catalog.get('key3');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(3);

      catalog.clearCache();

      (mockProvider.fetch as jest.Mock)
        .mockResolvedValueOnce(entity1)
        .mockResolvedValueOnce(entity2)
        .mockResolvedValueOnce(entity3);

      await catalog.get('key1');
      await catalog.get('key2');
      await catalog.get('key3');
      expect(mockProvider.fetch).toHaveBeenCalledTimes(6);
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
    (mockProvider.fetch as jest.Mock)
      .mockResolvedValueOnce(goodEntity)
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce(goodEntity);

    await catalog.get('good-key');

    await expect(catalog.get('bad-key')).rejects.toThrow('Fetch failed');

    const result = await catalog.get('good-key');
    expect(result).toBe(goodEntity);
  });
});
