import type { Mock } from 'vitest';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../catalog-kind';
import { ProcessorIconTooltipResolver } from './processor-icon-tooltip-resolver';

vi.mock('../../../../../../dynamic-catalog/dynamic-catalog-registry');

describe('ProcessorIconTooltipResolver', () => {
  const mockGetEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (DynamicCatalogRegistry.get as Mock).mockReturnValue({
      getEntity: mockGetEntity,
    });
  });

  describe('getProcessorIconTooltip', () => {
    it('should fetch from catalog and return formatted tooltip', async () => {
      mockGetEntity.mockResolvedValue({
        model: {
          description: 'Consumes messages from an endpoint',
        },
      });

      const result = await ProcessorIconTooltipResolver.getProcessorIconTooltip('from');

      expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Pattern, 'from');
      expect(result).toBe('From: Consumes messages from an endpoint');
    });

    it('should return undefined when catalog has no description', async () => {
      mockGetEntity.mockResolvedValue({
        model: {},
      });

      const result = await ProcessorIconTooltipResolver.getProcessorIconTooltip('from');

      expect(result).toBeUndefined();
    });

    it('should handle catalog errors and return undefined', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetEntity.mockRejectedValue(new Error('Catalog fetch failed'));

      const result = await ProcessorIconTooltipResolver.getProcessorIconTooltip('from');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch processor icon tooltip for from', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });
});
