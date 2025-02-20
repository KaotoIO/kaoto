import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../../models';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { KaotoForm } from '../../FormV2/KaotoForm';
import { getSchemasSlice } from './get-schemas-slices';

export const FormTest = (target: { kind: CatalogKind; range: { start: number; end: number | undefined } }) => {
  let schemas: [string, KaotoSchemaDefinition['schema']][] = [];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);

    schemas = getSchemasSlice(CamelCatalogService.getCatalogByKey(target.kind), target.range);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should have schemas', () => {
    expect(schemas).not.toHaveLength(0);
  });

  it('should render the form without an error', () => {
    schemas.forEach(([name, schema]) => {
      try {
        render(<KaotoForm schema={schema} onChange={jest.fn()} model={{}} />);
      } catch (e) {
        console.error(e);
        throw new Error(`Error rendering ${name} ${target.kind}`);
      }
    });
  });
};
