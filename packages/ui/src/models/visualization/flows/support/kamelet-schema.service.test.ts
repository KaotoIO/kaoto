import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';

describe('KameletSchemaService', () => {
  let kameletCatalogMap: Record<string, unknown>;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
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
});
