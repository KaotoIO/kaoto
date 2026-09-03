import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';

describe('CamelComponentSchemaService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('canBeDisabled', () => {
    it('should allow disabling DataMapper', () => {
      const result = CamelComponentSchemaService.canBeDisabled(DATAMAPPER_ID_PREFIX);

      expect(result).toBe(true);
    });

    it('should allow disabling processors that define disabled in schema', () => {
      const result = CamelComponentSchemaService.canBeDisabled('log' as keyof ProcessorDefinition);

      expect(result).toBe(true);
    });

    it('should not allow disabling processors without disabled property', () => {
      const result = CamelComponentSchemaService.canBeDisabled('from' as keyof ProcessorDefinition);

      expect(result).toBe(false);
    });
  });
});
