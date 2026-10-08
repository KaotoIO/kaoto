import { MockInstance } from 'vitest';

import { DynamicCatalogRegistry } from '../../../../../dynamic-catalog/dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from '../../../../../dynamic-catalog/models';
import { ICamelComponentDefinition } from '../../../../camel/camel-components-catalog';
import { ICamelProcessorDefinition } from '../../../../camel/camel-processors-catalog';
import { CatalogKind } from '../../../../catalog-kind';
import { CatalogResolverFactory } from './catalog-resolver.factory';

describe('CatalogResolverFactory', () => {
  let mockGetEntity: MockInstance<IDynamicCatalogRegistry['getEntity']>;

  beforeEach(() => {
    mockGetEntity = vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity');
  });

  describe('resolveProperty', () => {
    it('should resolve property when found', async () => {
      mockGetEntity.mockResolvedValue({ component: { title: 'Timer' } } as ICamelComponentDefinition);

      const result = await CatalogResolverFactory.resolveProperty(
        CatalogKind.Component,
        'timer',
        (def) => def?.component?.title,
      );

      expect(result).toBe('Timer');
    });

    it('should return fallback when property not found', async () => {
      mockGetEntity.mockResolvedValue(undefined);

      const result = await CatalogResolverFactory.resolveProperty(
        CatalogKind.Component,
        'unknown',
        (def) => def?.component?.title,
        'Fallback',
      );

      expect(result).toBe('Fallback');
    });

    it('should return undefined when no fallback provided', async () => {
      mockGetEntity.mockResolvedValue(undefined);

      const result = await CatalogResolverFactory.resolveProperty(
        CatalogKind.Component,
        'unknown',
        (def) => def?.component?.title,
      );

      expect(result).toBeUndefined();
    });

    it('should handle errors and return fallback', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetEntity.mockRejectedValue(new Error('Catalog error'));

      const result = await CatalogResolverFactory.resolveProperty(
        CatalogKind.Component,
        'timer',
        (def) => def?.component?.title,
        'Fallback',
      );

      expect(result).toBe('Fallback');
      consoleWarnSpy.mockRestore();
    });

    it('should accept empty string as valid value', async () => {
      mockGetEntity.mockResolvedValue({ component: { title: '' } } as ICamelComponentDefinition);

      const result = await CatalogResolverFactory.resolveProperty(
        CatalogKind.Component,
        'timer',
        (def) => def?.component?.title,
        'Fallback',
      );

      expect(result).toBe('');
    });
  });

  describe('resolvePropertyWithFallbacks', () => {
    it('should return value from first matching catalog', async () => {
      mockGetEntity.mockResolvedValue({ model: { title: 'Log' } } as ICamelProcessorDefinition);

      const result = await CatalogResolverFactory.resolvePropertyWithFallbacks(
        [CatalogKind.Processor, CatalogKind.Pattern],
        'log',
        (def) => def?.model?.title,
      );

      expect(result).toBe('Log');
      expect(mockGetEntity).toHaveBeenCalledTimes(1);
    });

    it('should try next catalog when first fails', async () => {
      mockGetEntity
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ model: { title: 'Pattern' } } as ICamelProcessorDefinition);

      const result = await CatalogResolverFactory.resolvePropertyWithFallbacks(
        [CatalogKind.Processor, CatalogKind.Pattern],
        'log',
        (def) => def?.model?.title,
      );

      expect(result).toBe('Pattern');
      expect(mockGetEntity).toHaveBeenCalledTimes(2);
    });

    it('should return fallback when all catalogs fail', async () => {
      mockGetEntity.mockResolvedValue(undefined);

      const result = await CatalogResolverFactory.resolvePropertyWithFallbacks(
        [CatalogKind.Processor, CatalogKind.Pattern],
        'unknown',
        (def) => def?.model?.title,
        'Fallback',
      );

      expect(result).toBe('Fallback');
    });

    it('should return undefined when no fallback provided', async () => {
      mockGetEntity.mockResolvedValue(undefined);

      const result = await CatalogResolverFactory.resolvePropertyWithFallbacks(
        [CatalogKind.Processor, CatalogKind.Pattern],
        'unknown',
        (def) => def?.model?.title,
      );

      expect(result).toBeUndefined();
    });

    it('should continue after catalog errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetEntity
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ model: { title: 'Success' } } as ICamelProcessorDefinition);

      const result = await CatalogResolverFactory.resolvePropertyWithFallbacks(
        [CatalogKind.Processor, CatalogKind.Pattern],
        'log',
        (def) => def?.model?.title,
      );

      expect(result).toBe('Success');
      consoleWarnSpy.mockRestore();
    });
  });
});
