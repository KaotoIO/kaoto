import { ComponentsCatalog } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';

describe('CamelCatalogService', () => {
  const catalog = {
    'component-1': 'random value',
  } as unknown as ComponentsCatalog[CatalogKind.Component];

  afterEach(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getCatalogByKey', () => {
    it('should return the catalog', () => {
      CamelCatalogService.setCatalogKey(CatalogKind.Component, catalog);

      const result = CamelCatalogService.getCatalogByKey(CatalogKind.Component);

      expect(result).toEqual(catalog);
    });
  });

  describe('getComponent', () => {
    it('should return the component', () => {
      CamelCatalogService.setCatalogKey(CatalogKind.Component, catalog);

      const component = CamelCatalogService.getComponent(CatalogKind.Component, 'component-1');

      expect(component).toEqual('random value');
    });

    it('should return `undefined` for an `undefined` component name', () => {
      CamelCatalogService.setCatalogKey(CatalogKind.Component, catalog);

      const component = CamelCatalogService.getComponent(CatalogKind.Component);

      expect(component).toBeUndefined();
    });
  });
});
