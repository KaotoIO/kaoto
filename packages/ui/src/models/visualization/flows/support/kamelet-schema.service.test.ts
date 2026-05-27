import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { setupDynamicCatalogRegistryMock } from '../../../../stubs/dynamic-catalog-registry-mock';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';

jest.mock('../../../../dynamic-catalog/dynamic-catalog-registry');

describe('KameletSchemaService', () => {
  let kameletCatalogMap: Record<string, unknown>;
  let catalogsMap: Awaited<ReturnType<typeof getFirstCatalogMap>>;

  beforeEach(async () => {
    catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    setupDynamicCatalogRegistryMock(catalogsMap);

    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'log-action': (kameletCatalogMap as any)['log-action'],
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'xj-template-action': (kameletCatalogMap as any)['xj-template-action'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Setup mock with error injection for specific kamelet
      setupDynamicCatalogRegistryMock(catalogsMap, [
        {
          kind: CatalogKind.Kamelet,
          name: 'error-kamelet',
          error: new Error('Catalog fetch failed'),
        },
      ]);

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

      consoleErrorSpy.mockRestore();
    });
  });
});
