import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { ICamelComponentDefinition } from '../../camel/camel-components-catalog';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';

describe('CamelCatalogService', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
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
});
