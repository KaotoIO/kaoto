import catalogLibrary from '@kaoto/camel-catalog/index.json';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';

describe('KameletSchemaService', () => {
  let kameletCatalogMap: Record<string, unknown>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'log-action': (kameletCatalogMap as any)['log-action'],
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'xj-template-action': (kameletCatalogMap as any)['xj-template-action'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    consoleErrorSpy?.mockRestore();
    CamelCatalogService.clearCatalogs();
  });

  describe('getNodeLabel', () => {
    it.each([
      ['source', 'source', undefined],
      ['sink', 'sink', undefined],
      ['', 'steps.0', undefined],
      [
        'beer-source',
        'source',
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'beer-source',
          },
        },
      ],
    ])('should return the %s for the %s label', (expected, path, step) => {
      const result = KameletSchemaService.getNodeLabel(step, path);

      expect(result).toEqual(expected);
    });
  });

  describe('getKameletCatalogEntry', () => {
    it('should return undefined when step is undefined', async () => {
      const result = await KameletSchemaService.getKameletCatalogEntry();
      expect(result).toBeUndefined();
    });

    it('should return undefined when step has no ref name', async () => {
      const result = await KameletSchemaService.getKameletCatalogEntry({ ref: {} });
      expect(result).toBeUndefined();
    });

    it('should handle catalog lookup errors gracefully', async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock DynamicCatalogRegistry to throw an error during catalog fetch
      const { DynamicCatalogRegistry } = await import('../../../../dynamic-catalog/dynamic-catalog-registry');
      const mockRegistry = {
        getEntity: jest.fn().mockRejectedValue(new Error('Catalog fetch failed')),
      };
      jest.spyOn(DynamicCatalogRegistry, 'get').mockReturnValue(mockRegistry as any);

      const step = {
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'error-kamelet',
        },
      };

      const result = await KameletSchemaService.getKameletCatalogEntry(step);

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load Kamelet catalog entry for error-kamelet:',
        expect.any(Error),
      );
    });
  });
});
