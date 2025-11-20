import { KaotoFunction } from '@kaoto/camel-catalog/types';

import {
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../models';
import { CatalogKind } from '../models/catalog-kind';
import { DynamicCatalog } from './dynamic-catalog';
import { DynamicCatalogRegistry } from './dynamic-catalog-registry';
import { ICatalogProvider, IDynamicCatalogRegistry } from './models';

describe('DynamicCatalogRegistry', () => {
  let registry: IDynamicCatalogRegistry;

  beforeEach(() => {
    registry = DynamicCatalogRegistry.get();
  });
  afterEach(() => {
    registry.clearRegistry();
  });

  describe('setCatalog', () => {
    it('should set a catalog provider for a given kind', () => {
      const mockProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'test-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const catalog = new DynamicCatalog(mockProvider);

      registry.setCatalog(CatalogKind.Component, catalog);

      const retrievedCatalog = registry.getCatalog(CatalogKind.Component);
      expect(retrievedCatalog).toBe(catalog);
    });

    it('should set multiple catalog providers for different kinds', () => {
      const componentProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'component-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const processorProvider: ICatalogProvider<ICamelProcessorDefinition> = {
        id: 'processor-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };

      const componentCatalog = new DynamicCatalog(componentProvider);
      const processorCatalog = new DynamicCatalog(processorProvider);

      registry.setCatalog(CatalogKind.Component, componentCatalog);
      registry.setCatalog(CatalogKind.Processor, processorCatalog);

      expect(registry.getCatalog(CatalogKind.Component)).toBe(componentCatalog);
      expect(registry.getCatalog(CatalogKind.Processor)).toBe(processorCatalog);
    });

    it('should override existing catalog provider when setting the same kind', () => {
      const firstProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'first-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const secondProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'second-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };

      const firstCatalog = new DynamicCatalog(firstProvider);
      const secondCatalog = new DynamicCatalog(secondProvider);

      registry.setCatalog(CatalogKind.Component, firstCatalog);
      registry.setCatalog(CatalogKind.Component, secondCatalog);

      const retrievedCatalog = registry.getCatalog(CatalogKind.Component);
      expect(retrievedCatalog).toBe(secondCatalog);
      expect(retrievedCatalog).not.toBe(firstCatalog);
    });

    it('should handle all catalog kinds', () => {
      const componentProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'component-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const processorProvider: ICatalogProvider<ICamelProcessorDefinition> = {
        id: 'processor-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const languageProvider: ICatalogProvider<ICamelLanguageDefinition> = {
        id: 'language-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const dataformatProvider: ICatalogProvider<ICamelDataformatDefinition> = {
        id: 'dataformat-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const kameletProvider: ICatalogProvider<IKameletDefinition> = {
        id: 'kamelet-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };

      registry.setCatalog(CatalogKind.Component, new DynamicCatalog(componentProvider));
      registry.setCatalog(CatalogKind.Processor, new DynamicCatalog(processorProvider));
      registry.setCatalog(CatalogKind.Pattern, new DynamicCatalog(processorProvider));
      registry.setCatalog(CatalogKind.Entity, new DynamicCatalog(processorProvider));
      registry.setCatalog(CatalogKind.Language, new DynamicCatalog(languageProvider));
      registry.setCatalog(CatalogKind.Dataformat, new DynamicCatalog(dataformatProvider));
      registry.setCatalog(CatalogKind.Loadbalancer, new DynamicCatalog(processorProvider));
      registry.setCatalog(CatalogKind.Kamelet, new DynamicCatalog(kameletProvider));

      expect(registry.getCatalog(CatalogKind.Component)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Processor)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Pattern)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Entity)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Language)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Dataformat)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Loadbalancer)).toBeDefined();
      expect(registry.getCatalog(CatalogKind.Kamelet)).toBeDefined();
    });
  });

  describe('getCatalog', () => {
    it('should return undefined when catalog is not set', () => {
      const catalog = registry.getCatalog(CatalogKind.Component);
      expect(catalog).toBeUndefined();
    });

    it('should return the correct catalog for a given kind', () => {
      const mockProvider: ICatalogProvider<ICamelLanguageDefinition> = {
        id: 'test-provider',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const expectedCatalog = new DynamicCatalog(mockProvider);

      registry.setCatalog(CatalogKind.Language, expectedCatalog);

      const catalog = registry.getCatalog(CatalogKind.Language);
      expect(catalog).toBe(expectedCatalog);
    });

    it('should return different catalogs for different kinds', () => {
      const provider1: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'provider-1',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };
      const provider2: ICatalogProvider<ICamelProcessorDefinition> = {
        id: 'provider-2',
        fetch: jest.fn(),
        fetchAll: jest.fn(),
      };

      const catalog1 = new DynamicCatalog(provider1);
      const catalog2 = new DynamicCatalog(provider2);

      registry.setCatalog(CatalogKind.Component, catalog1);
      registry.setCatalog(CatalogKind.Pattern, catalog2);

      expect(registry.getCatalog(CatalogKind.Component)).toBe(catalog1);
      expect(registry.getCatalog(CatalogKind.Pattern)).toBe(catalog2);
      expect(registry.getCatalog(CatalogKind.Component)).not.toBe(catalog2);
    });
  });

  describe('getEntity', () => {
    it('should return undefined when catalog is not set', async () => {
      const entity = await registry.getEntity(CatalogKind.Component, 'test-key');
      expect(entity).toBeUndefined();
    });

    it('should retrieve an entity from the catalog', async () => {
      const mockEntity: ICamelComponentDefinition = {
        component: {
          name: 'test-component',
          kind: 'component',
        },
      } as ICamelComponentDefinition;

      const mockProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'component-provider',
        fetch: jest.fn().mockResolvedValue(mockEntity),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      registry.setCatalog(CatalogKind.Component, catalog);

      const entity = await registry.getEntity(CatalogKind.Component, 'test-component');

      expect(entity).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledWith('test-component');
    });

    it('should pass options to catalog.get', async () => {
      const mockEntity: ICamelComponentDefinition = {
        component: {
          name: 'test-component',
          kind: 'component',
        },
      } as ICamelComponentDefinition;

      const mockProvider: ICatalogProvider<ICamelComponentDefinition> = {
        id: 'test-provider',
        fetch: jest.fn().mockResolvedValue(mockEntity),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      const getSpy = jest.spyOn(catalog, 'get');
      registry.setCatalog(CatalogKind.Component, catalog);

      await registry.getEntity(CatalogKind.Component, 'test-key', { forceFresh: true });

      expect(getSpy).toHaveBeenCalledWith('test-key', { forceFresh: true });
    });

    it('should use default options when not provided', async () => {
      const mockEntity: IKameletDefinition = {
        kind: 'Kamelet',
        metadata: { name: 'test-kamelet' },
        spec: { definition: {} },
      } as IKameletDefinition;

      const mockProvider: ICatalogProvider<IKameletDefinition> = {
        id: 'test-provider',
        fetch: jest.fn().mockResolvedValue(mockEntity),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      const getSpy = jest.spyOn(catalog, 'get');
      registry.setCatalog(CatalogKind.Kamelet, catalog);

      await registry.getEntity(CatalogKind.Kamelet, 'test-key');

      expect(getSpy).toHaveBeenCalledWith('test-key', {});
    });

    it('should return cached entity when forceFresh is false', async () => {
      const mockEntity = {
        model: { name: 'test-language', kind: 'language' },
        properties: {},
        propertiesSchema: {},
      } as unknown as ICamelLanguageDefinition;

      const mockProvider: ICatalogProvider<ICamelLanguageDefinition> = {
        id: 'test-provider',
        fetch: jest.fn().mockResolvedValue(mockEntity),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      registry.setCatalog(CatalogKind.Language, catalog);

      // First call - should fetch from provider
      const firstResult = await registry.getEntity(CatalogKind.Language, 'test-key');
      expect(firstResult).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1);

      // Second call - should return from cache
      const secondResult = await registry.getEntity(CatalogKind.Language, 'test-key');
      expect(secondResult).toBe(mockEntity);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(1); // Still called only once
    });

    it('should bypass cache when forceFresh is true', async () => {
      const mockEntity1 = {
        model: { name: 'dataformat-v1' },
        properties: {},
        propertiesSchema: {},
      } as unknown as ICamelDataformatDefinition;
      const mockEntity2 = {
        model: { name: 'dataformat-v2' },
        properties: {},
        propertiesSchema: {},
      } as unknown as ICamelDataformatDefinition;

      const mockProvider: ICatalogProvider<ICamelDataformatDefinition> = {
        id: 'test-provider',
        fetch: jest.fn().mockResolvedValueOnce(mockEntity1).mockResolvedValueOnce(mockEntity2),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      registry.setCatalog(CatalogKind.Dataformat, catalog);

      // First call
      const firstResult = await registry.getEntity(CatalogKind.Dataformat, 'test-key');
      expect(firstResult).toBe(mockEntity1);

      // Second call with forceFresh
      const secondResult = await registry.getEntity(CatalogKind.Dataformat, 'test-key', { forceFresh: true });
      expect(secondResult).toBe(mockEntity2);
      expect(mockProvider.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return undefined when entity is not found', async () => {
      const mockProvider: ICatalogProvider<ICamelProcessorDefinition> = {
        id: 'test-provider',
        fetch: jest.fn().mockResolvedValue(undefined),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog(mockProvider);
      registry.setCatalog(CatalogKind.Processor, catalog);

      const entity = await registry.getEntity(CatalogKind.Processor, 'non-existent-key');

      expect(entity).toBeUndefined();
      expect(mockProvider.fetch).toHaveBeenCalledWith('non-existent-key');
    });

    it('should handle different entity types correctly', async () => {
      const mockEntity = {
        name: 'customFunction',
        displayName: 'Custom Function',
        description: 'A custom function for testing',
        returnType: 'String',
        examples: [],
      } as unknown as KaotoFunction;

      const mockProvider: ICatalogProvider<KaotoFunction> = {
        id: 'custom-provider',
        fetch: jest.fn().mockResolvedValue(mockEntity),
        fetchAll: jest.fn(),
      };

      const catalog = new DynamicCatalog<KaotoFunction>(mockProvider);
      registry.setCatalog(CatalogKind.Function, catalog);

      const entity = await registry.getEntity(CatalogKind.Function, 'custom-key');

      expect(entity).toBe(mockEntity);
      expect(entity?.name).toBe('customFunction');
      expect(entity?.displayName).toBe('Custom Function');
    });
  });

  it('should maintain a singleton registry', () => {
    const registry1 = DynamicCatalogRegistry.get();
    const registry2 = DynamicCatalogRegistry.get();

    expect(registry1).toBe(registry2);
  });
});
