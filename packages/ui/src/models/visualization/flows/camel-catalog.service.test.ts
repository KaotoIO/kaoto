import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { ICamelComponentDefinition } from '../../camel/camel-components-catalog';
import { IKameletDefinition } from '../../camel/kamelets-catalog';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';

describe('CamelCatalogService', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
  });

  afterEach(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getComponent', () => {
    it('should return the component', () => {
      const component = CamelCatalogService.getComponent(CatalogKind.Component, 'timer');

      expect(component?.component.name).toBe('timer');
      expect(component).toEqual((componentCatalogMap as Record<string, unknown>).timer);
    });

    it('should return `undefined` for an `undefined` component name', () => {
      const component = CamelCatalogService.getComponent(CatalogKind.Component);

      expect(component).toBeUndefined();
    });
  });

  describe('getCatalogLookup', () => {
    it('should return `undefined` for an empty string component name', () => {
      const lookup = CamelCatalogService.getCatalogLookup('');

      expect(lookup).toBeUndefined();
    });

    it('should return a component from the catalog lookup', () => {
      const lookup = CamelCatalogService.getCatalogLookup('timer');

      expect(lookup).toEqual({
        catalogKind: CatalogKind.Component,
        definition: (componentCatalogMap as Record<string, unknown>).timer,
      });
    });

    it('should return a kamelet from the catalog lookup', () => {
      // Add a test kamelet to the catalog
      const testKameletCatalog = {
        ...kameletCatalogMap,
        'chuck-norris-source': {
          kind: 'Kamelet',
          metadata: { name: 'chuck-norris-source' },
          spec: { definition: {} },
        } as IKameletDefinition,
      };

      CamelCatalogService.setCatalogKey(
        CatalogKind.Kamelet,
        testKameletCatalog as unknown as Record<string, IKameletDefinition>,
      );

      const lookup = CamelCatalogService.getCatalogLookup('kamelet:chuck-norris-source');

      expect(lookup).toEqual({
        catalogKind: CatalogKind.Kamelet,
        definition: testKameletCatalog['chuck-norris-source'],
      });
    });

    it('should return the kamelet component for unknown kamelets', () => {
      CamelCatalogService.setCatalogKey(
        CatalogKind.Kamelet,
        kameletCatalogMap as unknown as Record<string, IKameletDefinition>,
      );

      const lookup = CamelCatalogService.getCatalogLookup('kamelet:non-existing-kamelet');

      expect(lookup).toEqual({
        catalogKind: CatalogKind.Component,
        definition: (componentCatalogMap as Record<string, unknown>).kamelet,
      });
    });
  });
});
